import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSocialDateKey, isoToZurichLocal, zurichDateKey, zurichLocalToIso } from '../shared/utils/socialDateTime'

afterEach(() => vi.unstubAllEnvs())

describe('Zurich editorial date inputs', () => {
  it('converts winter and summer local minutes using the Swiss offset', () => {
    expect(zurichLocalToIso('2026-01-17T18:00')).toBe('2026-01-17T17:00:00.000Z')
    expect(zurichLocalToIso('2026-07-17T18:00')).toBe('2026-07-17T16:00:00.000Z')
    expect(isoToZurichLocal('2026-01-17T17:00:00.000Z')).toBe('2026-01-17T18:00')
    expect(isoToZurichLocal('2026-07-17T18:00:00+02:00')).toBe('2026-07-17T18:00')
  })

  it('rejects missing spring minutes and keeps both valid sides of the transition', () => {
    expect(zurichLocalToIso('2026-03-29T01:59')).toBe('2026-03-29T00:59:00.000Z')
    expect(zurichLocalToIso('2026-03-29T02:00')).toBeNull()
    expect(zurichLocalToIso('2026-03-29T02:30')).toBeNull()
    expect(zurichLocalToIso('2026-03-29T02:59')).toBeNull()
    expect(zurichLocalToIso('2026-03-29T03:00')).toBe('2026-03-29T01:00:00.000Z')
  })

  it('rejects repeated autumn minutes instead of selecting one of two instants', () => {
    expect(zurichLocalToIso('2026-10-25T01:59')).toBe('2026-10-24T23:59:00.000Z')
    for (const minute of ['02:00', '02:30', '02:59']) expect(zurichLocalToIso(`2026-10-25T${minute}`)).toBeNull()
    expect(zurichLocalToIso('2026-10-25T03:00')).toBe('2026-10-25T02:00:00.000Z')
    expect(isoToZurichLocal('2026-10-25T00:30:00Z')).toBe('2026-10-25T02:30')
    expect(isoToZurichLocal('2026-10-25T01:30:00Z')).toBe('2026-10-25T02:30')
  })

  it('validates actual calendar dates and the exact datetime-local syntax', () => {
    expect(zurichLocalToIso('2028-02-29T12:00')).toBe('2028-02-29T11:00:00.000Z')
    for (const value of ['', '2026-02-29T12:00', '2026-04-31T12:00', '2026-13-01T12:00', '2026-01-00T12:00',
      '2026-01-17T24:00', '2026-01-17T12:60', '2026-1-17T12:00', '2026-01-17 12:00',
      '2026-01-17T12:00:00', '2026-01-17T12:00Z', ' 2026-01-17T12:00', '0000-01-01T12:00']) {
      expect(zurichLocalToIso(value), value).toBeNull()
    }
    expect(isSocialDateKey('2028-02-29')).toBe(true)
    for (const value of ['2026-02-29', '2026-10-17T12:00', '2026-1-01', ['2026-10-17'], null]) expect(isSocialDateKey(value)).toBe(false)
  })

  it('formats midnight and year boundaries in Zurich and rejects non-absolute instants', () => {
    expect(isoToZurichLocal('2026-12-31T23:00:00Z')).toBe('2027-01-01T00:00')
    expect(zurichDateKey('2026-10-16T22:30:00Z')).toBe('2026-10-17')
    for (const value of [null, '', 'invalid', '2026-02-30T12:00:00Z', '2026-10-17T12:00', '2026-10-17']) {
      expect(isoToZurichLocal(value)).toBe('')
    }
    expect(zurichDateKey('invalid')).toBe('')
  })

  it('rejects every trailing line terminator or whitespace instead of accepting a partial match', () => {
    for (const suffix of ['\n', '\r', '\r\n', '\u2028', '\u2029', '\t', ' ']) {
      expect(isSocialDateKey(`2026-10-17${suffix}`)).toBe(false)
      expect(zurichLocalToIso(`2026-10-17T12:00${suffix}`)).toBeNull()
      expect(isoToZurichLocal(`2026-10-17T10:00:00Z${suffix}`)).toBe('')
      expect(isoToZurichLocal(`2026-10-17T12:00:00+02:00${suffix}`)).toBe('')
      expect(zurichDateKey(`2026-10-17T10:00:00Z${suffix}`)).toBe('')
    }
  })

  it('does not emit a local date outside the four-digit supported calendar range', () => {
    expect(isoToZurichLocal('9999-12-31T23:30:00Z')).toBe('')
    expect(zurichDateKey('9999-12-31T23:30:00Z')).toBe('')
    expect(isoToZurichLocal('9999-12-31T20:30:00Z')).toBe('9999-12-31T21:30')
  })

  it('does not depend on the host timezone', () => {
    for (const timezone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
      vi.stubEnv('TZ', timezone)
      expect(zurichLocalToIso('2026-07-17T18:00')).toBe('2026-07-17T16:00:00.000Z')
      expect(isoToZurichLocal('2026-12-31T23:00:00Z')).toBe('2027-01-01T00:00')
      expect(zurichLocalToIso('2026-10-25T02:30')).toBeNull()
    }
  })
})
