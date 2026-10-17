import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SocialPost } from '../shared/types/socialEditorial'
import { calendarDays, matchesSocialCalendarFilters, parseSocialCalendarFilters, socialPlatformLabel, socialPostCalendarIso, socialPostFormat, socialPostMedia } from '../app/utils/socialCalendar'

const post = (overrides: Partial<SocialPost> = {}): SocialPost => ({
  id: 'calendar-demo', studioContentId: null, platform: 'linkedin', article_title: 'Projet de démonstration',
  article_url: 'https://example.invalid/projet', content: 'Une réalisation pour une entreprise locale.',
  publication_mode: 'automatic', approved_version: null, media_images: [], media_items: [],
  media_kind: null, media_url: null, media_title: null, status: 'draft', external_post_url: null,
  last_error: null, planned_at: null, publish_after: null, published_at: null,
  version: 1, created_at: '2026-10-01T08:00:00Z', updated_at: '2026-10-01T08:00:00Z', ...overrides,
})
const all = () => parseSocialCalendarFilters({}, '2026-10-17')

afterEach(() => vi.useRealTimers())

describe('Social editorial calendar dates', () => {
  it('starts weeks on Monday across a year boundary', () => {
    expect(calendarDays('2027-01-01', 'week')).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03',
    ])
  })

  it('keeps every calendar day through both clock changes', () => {
    expect(calendarDays('2026-03-29', 'week')).toEqual([
      '2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29',
    ])
    expect(calendarDays('2026-10-25', 'week')).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ])
  })

  it('returns a six-week month grid with leap days and adjacent months', () => {
    const leapMonth = calendarDays('2028-02-29', 'month')
    expect(leapMonth).toHaveLength(42)
    expect(leapMonth[0]).toBe('2028-01-31')
    expect(leapMonth).toContain('2028-02-29')
    expect(leapMonth.at(-1)).toBe('2028-03-12')
    const december = calendarDays('2026-12-15', 'month')
    expect(december[0]).toBe('2026-11-30')
    expect(december.at(-1)).toBe('2027-01-10')
    expect(calendarDays('2026-02-30', 'month')).toEqual([])
  })

  it('omits adjacent grid days outside the supported four-digit calendar range', () => {
    for (const view of ['week', 'month'] as const) {
      const days = calendarDays('9999-12-31', view)
      expect(days).toContain('9999-12-31')
      expect(days.at(-1)).toBe('9999-12-31')
      expect(days.every(day => /^\d{4}-\d{2}-\d{2}$/.test(day))).toBe(true)
      expect(days.every(day => day >= '0001-01-01' && day <= '9999-12-31')).toBe(true)
    }
  })

  it('uses only an intentional plan or the applicable publication date', () => {
    const planned = '2026-10-17T12:00:00Z'
    const authorized = '2026-10-18T16:00:00Z'
    const published = '2026-10-18T16:03:00Z'
    for (const status of ['draft', 'failed', 'rejected'] as const) {
      expect(socialPostCalendarIso(post({ status, publish_after: authorized }))).toBeNull()
      expect(socialPostCalendarIso(post({ status, planned_at: planned, publish_after: authorized }))).toBe(planned)
    }
    for (const status of ['approved', 'publishing'] as const) {
      expect(socialPostCalendarIso(post({ status, planned_at: planned, publish_after: authorized }))).toBe(authorized)
      expect(socialPostCalendarIso(post({ status, publication_mode: 'manual', planned_at: planned, publish_after: authorized }))).toBe(planned)
    }
    expect(socialPostCalendarIso(post({ status: 'published', planned_at: planned, publish_after: authorized, published_at: published }))).toBe(published)
    expect(socialPostCalendarIso(post({ status: 'published', publish_after: authorized }))).toBe(authorized)
    expect(socialPostCalendarIso(post({ planned_at: '2026-02-30T12:00:00Z' }))).toBeNull()
    expect(socialPostCalendarIso(post())).toBeNull()
  })
})

describe('Social editorial calendar filters', () => {
  it('parses safe URL filters, limits search and defaults to the Swiss date', () => {
    expect(parseSocialCalendarFilters({ platform: 'x', status: 'failed', format: 'carousel', view: 'list', date: '2028-02-29', search: '  PROJET  ' })).toEqual({
      platform: 'x', status: 'failed', format: 'carousel', view: 'list', date: '2028-02-29', search: '  PROJET  ',
    })
    expect(parseSocialCalendarFilters({ search: 'x'.repeat(400) }, '2026-10-17').search).toHaveLength(300)
    expect(parseSocialCalendarFilters({ search: 'entreprise ' }, '2026-10-17').search).toBe('entreprise ')
    const invalid = parseSocialCalendarFilters({ platform: ['x'], status: ['failed', 'review'], format: 'audio', view: ['month'], date: '2026-02-29', search: ['test'] }, '2026-10-17')
    expect(invalid).toEqual({ platform: 'all', status: 'all', format: 'all', view: 'week', date: '2026-10-17', search: '' })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-16T22:30:00Z'))
    expect(parseSocialCalendarFilters({}).date).toBe('2026-10-17')
  })

  it('keeps review and waiting groups consistent with the existing workflow', () => {
    const documents = ['draft', 'failed', 'approved', 'publishing', 'published', 'rejected'].map(status => post({ id: status, status: status as SocialPost['status'] }))
    expect(documents.filter(item => matchesSocialCalendarFilters(item, { ...all(), status: 'review' })).map(item => item.id)).toEqual(['draft', 'failed'])
    expect(documents.filter(item => matchesSocialCalendarFilters(item, { ...all(), status: 'waiting' })).map(item => item.id)).toEqual(['approved', 'publishing'])
    for (const status of ['published', 'failed', 'rejected'] as const) {
      expect(documents.filter(item => matchesSocialCalendarFilters(item, { ...all(), status })).map(item => item.id)).toEqual([status])
    }
  })

  it('falls back from a non-exact URL date and rejects that date safely when building a calendar', () => {
    for (const suffix of ['\n', '\r', '\r\n', '\u2028', '\u2029', ' ']) {
      const date = `2026-10-17${suffix}`
      const filters = parseSocialCalendarFilters({ date }, '2026-11-03')
      expect(filters.date).toBe('2026-11-03')
      expect(calendarDays(date, 'week')).toEqual([])
      expect(calendarDays(date, 'month')).toEqual([])
      expect(calendarDays(filters.date, 'week')).toHaveLength(7)
    }
  })

  it('combines platform, format and search without changing publications', () => {
    const document = post({ platform: 'instagram', media_items: [{ type: 'video', url: 'https://example.invalid/demo.mp4', alt: 'Démonstration' }] })
    const before = JSON.stringify(document)
    expect(matchesSocialCalendarFilters(document, { ...all(), platform: 'instagram', format: 'video', search: 'ENTREPRISE' })).toBe(true)
    expect(matchesSocialCalendarFilters(document, { ...all(), search: '  entreprise locale  ' })).toBe(true)
    expect(matchesSocialCalendarFilters(document, { ...all(), platform: 'x' })).toBe(false)
    expect(matchesSocialCalendarFilters(document, { ...all(), format: 'image' })).toBe(false)
    expect(matchesSocialCalendarFilters(document, { ...all(), search: 'absent' })).toBe(false)
    expect(JSON.stringify(document)).toBe(before)
    expect(['linkedin', 'x', 'instagram'].map(platform => socialPlatformLabel(platform as SocialPost['platform']))).toEqual(['LinkedIn', 'X', 'Instagram'])
  })

  it('recognizes text, legacy images, videos, mixed carousels and documents', () => {
    const image = { url: 'https://example.invalid/demo.jpg', alt: 'Démonstration' }
    const video = { type: 'video' as const, url: 'https://example.invalid/demo.mp4', alt: 'Démonstration vidéo' }
    expect(socialPostFormat(post())).toBe('text')
    expect(socialPostFormat(post({ media_images: [image] }))).toBe('image')
    expect(socialPostFormat(post({ media_items: [video] }))).toBe('video')
    expect(socialPostFormat(post({ media_items: [{ ...image, type: 'image' }, video] }))).toBe('carousel')
    expect(socialPostFormat(post({ media_images: [image, image] }))).toBe('carousel')
    expect(socialPostFormat(post({ media_kind: 'document', media_url: 'https://example.invalid/demo.pdf', media_images: [image, image] }))).toBe('document')
    const media = socialPostMedia(post({ media_images: [image] }))
    expect(media).toEqual([{ ...image, type: 'image' }])
    media[0]!.alt = 'Copie modifiée'
    expect(image.alt).toBe('Démonstration')
  })
})
