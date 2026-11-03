import { describe, expect, it } from 'vitest'
import type { SocialPost } from '../shared/types/socialEditorial'
import { canMoveSocialPost, resolveSocialPostMove } from '../app/utils/socialCalendarMove'

const draft = (planned_at: string | null = null, status: SocialPost['status'] = 'draft') => ({ status, planned_at })

describe('Editorial calendar movement permissions', () => {
  it.each(['draft', 'failed'] as const)('allows %s posts to move without granting publication approval', (status) => {
    const post = draft(null, status)
    expect(canMoveSocialPost(post)).toBe(true)
    expect(resolveSocialPostMove(post, '2026-10-17')).toEqual({ ok: true, plannedAt: '2026-10-17T16:00:00.000Z', unchanged: false })
    expect(post).toEqual({ status, planned_at: null })
  })

  it.each(['approved', 'publishing', 'published', 'rejected'] as const)('never moves or clears a %s post', (status) => {
    const post = draft('2026-10-17T16:00:00Z', status)
    expect(canMoveSocialPost(post)).toBe(false)
    for (const target of ['2026-10-18', '2026-10-17', null]) {
      expect(resolveSocialPostMove(post, target)).toEqual({ ok: false, error: expect.any(String) })
    }
  })
})

describe('Editorial calendar movement dates', () => {
  it.each([
    ['2026-01-17', '2026-01-17T17:00:00.000Z'],
    ['2026-07-17', '2026-07-17T16:00:00.000Z'],
  ])('uses 18:00 Swiss time for an undated draft on %s', (target, plannedAt) => {
    expect(resolveSocialPostMove(draft(), target!)).toEqual({ ok: true, plannedAt, unchanged: false })
  })

  it.each([
    ['2026-01-17T17:37:00Z', '2026-07-17', '2026-07-17T16:37:00.000Z'],
    ['2026-07-17T16:37:00Z', '2026-11-17', '2026-11-17T17:37:00.000Z'],
    ['2026-01-17T10:37:00-05:00', '2026-07-17', '2026-07-17T14:37:00.000Z'],
    ['2026-07-17T22:15:00Z', '2026-11-17', '2026-11-16T23:15:00.000Z'],
  ])('preserves the Swiss hour and minute when moving %s to %s', (source, target, plannedAt) => {
    expect(resolveSocialPostMove(draft(source), target!)).toEqual({ ok: true, plannedAt, unchanged: false })
  })

  it.each([
    ['2026-10-17T16:37:43.123+00:00', '2026-10-17'],
    ['2026-10-16T22:15:00Z', '2026-10-17'],
    ['2026-10-25T00:30:21Z', '2026-10-25'],
    ['2026-10-25T01:30:21Z', '2026-10-25'],
  ])('keeps the original instant verbatim for a move to its existing Swiss day: %s', (source, target) => {
    expect(resolveSocialPostMove(draft(source), target!)).toEqual({ ok: true, plannedAt: source, unchanged: true })
  })

  it('clears a date and recognizes an already undated draft', () => {
    expect(resolveSocialPostMove(draft('2026-10-17T16:00:00Z'), null)).toEqual({ ok: true, plannedAt: null, unchanged: false })
    expect(resolveSocialPostMove(draft(), null)).toEqual({ ok: true, plannedAt: null, unchanged: true })
    // Clearing a malformed date does not need to infer a replacement time.
    expect(resolveSocialPostMove(draft('invalid'), null)).toEqual({ ok: true, plannedAt: null, unchanged: false })
  })

  it.each(['', '2026-02-29', '2026-02-30', '2026-13-01', '0000-01-01', '2026-10-17\n', '2026-10-17 ', '2026-10-17T18:00'])('rejects the invalid calendar target %j', (target) => {
    expect(resolveSocialPostMove(draft(), target)).toEqual({ ok: false, error: expect.any(String) })
  })

  it.each(['invalid', '', '2026-02-30T16:00:00Z', '2026-10-17T18:00', '2026-10-17T16:00:00Z\n'])('rejects an invalid existing date instead of guessing an hour: %j', (source) => {
    expect(resolveSocialPostMove(draft(source), '2026-10-18')).toEqual({ ok: false, error: expect.any(String) })
  })

  it.each([
    ['2026-03-28T01:30:00Z', '2026-03-29'],
    ['2026-10-24T00:30:00Z', '2026-10-25'],
  ])('rejects an impossible or repeated Swiss local minute when moving %s to %s', (source, target) => {
    expect(resolveSocialPostMove(draft(source), target!)).toEqual({ ok: false, error: expect.stringContaining('changement d’heure') })
  })

  it('can move an existing repeated local minute to an unambiguous day', () => {
    expect(resolveSocialPostMove(draft('2026-10-25T01:30:00Z'), '2026-10-26')).toEqual({ ok: true, plannedAt: '2026-10-26T01:30:00.000Z', unchanged: false })
  })

  it('accepts a real leap day', () => {
    expect(resolveSocialPostMove(draft(), '2028-02-29')).toEqual({ ok: true, plannedAt: '2028-02-29T17:00:00.000Z', unchanged: false })
  })
})
