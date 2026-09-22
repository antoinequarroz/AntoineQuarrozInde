import { describe, expect, it } from 'vitest'
import { nextSocialPublicationAt } from '../server/utils/socialPublication'

describe('social publication schedule', () => {
  it('uses 18:00 Europe/Zurich on the same day before the cutoff', () => {
    expect(nextSocialPublicationAt(new Date('2026-09-22T14:00:00Z')).toISOString())
      .toBe('2026-09-22T16:00:00.000Z')
  })

  it('uses the following day after the cutoff', () => {
    expect(nextSocialPublicationAt(new Date('2026-09-22T16:01:00Z')).toISOString())
      .toBe('2026-09-23T16:00:00.000Z')
  })

  it('honours the winter offset in Europe/Zurich', () => {
    expect(nextSocialPublicationAt(new Date('2026-12-22T12:00:00Z')).toISOString())
      .toBe('2026-12-22T17:00:00.000Z')
  })
})
