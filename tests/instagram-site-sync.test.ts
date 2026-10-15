import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateInstagramSnapshot, validateInstagramDrafts, studioInstagramContentId } from '../server/utils/instagramSync'
import { socialSiteResponse, SOCIAL_SITE_QUERY } from '../server/utils/socialSiteStats'
import { requireAutomatedSocialPlatform, validateSocialContent } from '../server/utils/socialPublication'

const now = new Date('2026-10-14T14:00:00Z')
const sample = () => ({ schemaVersion: 1, expectedUsername: 'antoinequarroz.dev', state: 'connected',
  readOnly: true, publishingEnabled: false, chargedMicroUSD: 0, collectedAt: now.toISOString(),
  lastSuccessfulAt: now.toISOString(), period: { from: '2026-09-30T00:00:00+02:00', to: '2026-10-14T00:00:00+02:00' },
  profile: { id: '17841434338571820', username: 'antoinequarroz.dev', followers: 255, mediaCount: 1 },
  metrics: { reach: 1333, accounts_engaged: 68, total_interactions: 95 }, media: [], errors: [],
})

beforeEach(() => {
  vi.stubGlobal('createError', (options: any) => Object.assign(new Error(options.message), options))
})
afterEach(() => vi.unstubAllGlobals())

describe('private Instagram observation boundary', () => {
  it('strips untrusted upstream properties and preserves unknown vs confirmed zero', () => {
    const value = { ...sample(), access_token: 'must-not-survive', metrics: { reach: 0, accounts_engaged: null }, errors: ['Bearer private-upstream-body'] }
    const safe = validateInstagramSnapshot(value, now)
    expect(safe.metrics).toEqual({ reach: 0, accounts_engaged: null, total_interactions: null })
    expect(JSON.stringify(safe)).not.toMatch(/must-not-survive|private-upstream-body|access_token/)
  })
  it.each([
    { expectedUsername: 'livrematchfr' }, { profile: { ...sample().profile, id: '123' } },
    { publishingEnabled: true }, { readOnly: false }, { chargedMicroUSD: 1 }, { chargedMicroUSD: '0' },
    { metrics: { reach: -1 } }, { metrics: { reach: '42' } },
    { collectedAt: '2027-01-01T00:00:00Z' }, { period: { from: '2026-10-01T00:00:00+02:00', to: '2026-10-14T00:00:00+02:00' } },
  ])('rejects foreign identities, writes, costs or invalid measurement contracts: %j', override => {
    expect(() => validateInstagramSnapshot({ ...sample(), ...override }, now)).toThrow()
  })
  it('accepts a 14-day window crossing Zurich winter DST, not a drifting UTC midnight window', () => {
    const value = { ...sample(), collectedAt: '2026-10-26T14:00:00Z', lastSuccessfulAt: '2026-10-26T14:00:00Z',
      period: { from: '2026-10-12T00:00:00+02:00', to: '2026-10-26T00:00:00+01:00' } }
    expect(validateInstagramSnapshot(value, new Date(value.collectedAt)).period?.to).toBe('2026-10-25T23:00:00.000Z')
    value.period.from = '2026-10-12T00:00:00Z'
    expect(() => validateInstagramSnapshot(value, new Date(value.collectedAt))).toThrow()
  })
  it('retains a dated last-good observation on a collection failure', () => {
    const value = { ...sample(), state: 'error', collectedAt: '2026-10-14T15:00:00Z', errors: ['connection unavailable'] }
    const safe = validateInstagramSnapshot(value, new Date(value.collectedAt))
    expect(safe.lastSuccessfulAt).toBe(now.toISOString())
    expect(safe.profile?.followers).toBe(255)
    expect(safe.metrics.reach).toBe(1333)
    expect(safe.state).toBe('error')
  })
  it('rejects media paging tokens and foreign URLs', () => {
    const media = { id: '123', caption: 'Test', type: 'VIDEO', url: 'https://www.instagram.com/reel/abc/?access_token=private', publishedAt: null, likes: 0, comments: null }
    expect(() => validateInstagramSnapshot({ ...sample(), media: [media] }, now)).toThrow()
    media.url = 'https://www.instagram.com/reel/abc/'
    expect(validateInstagramSnapshot({ ...sample(), media: [media] }, now).media[0]?.comments).toBeNull()
  })
})

describe('text-only draft import', () => {
  it('always starts as a draft, disregards approval from the studio, and keeps a stable source ID', () => {
    const source = { id: '12345678-0000-0000-0000-000000000001', caption: 'Une idée 💡\nSuite', status: 'approved', revision: 80 }
    const [row] = validateInstagramDrafts([source])
    expect(row?.status).toBe('draft')
    expect(row?.version).toBe(1)
    expect(row?.source_key).toBe(`studio-instagram:${source.id}`)
    expect(row).not.toHaveProperty('publish_after')
    expect(studioInstagramContentId(row?.source_key)).toBe(source.id)
    expect(studioInstagramContentId('studio-instagram:../../private')).toBeNull()
    expect(() => validateInstagramDrafts([source, source])).toThrow()
  })
  it('counts Instagram unicode characters without rejecting valid emoji captions', () => {
    expect(validateSocialContent('instagram', '💡'.repeat(2200))).toHaveLength(4400)
    expect(() => validateSocialContent('instagram', '💡'.repeat(2201))).toThrow()
    expect(() => requireAutomatedSocialPlatform('instagram')).toThrow(/manuelle/)
    expect(requireAutomatedSocialPlatform('linkedin')).toBe('linkedin')
    expect(requireAutomatedSocialPlatform('x')).toBe('x')
  })
})

describe('website channel measurement', () => {
  it('groups before counting unique people and queries every network, rather than using a top-N source list', () => {
    expect(SOCIAL_SITE_QUERY).toContain('GROUP BY platform')
    expect(SOCIAL_SITE_QUERY).toContain('uniqExact(distinct_id)')
    expect(SOCIAL_SITE_QUERY).not.toContain('LIMIT 8')
    expect(SOCIAL_SITE_QUERY).toContain('is_internal')
    expect(SOCIAL_SITE_QUERY).toContain('HeadlessChrome')
  })
  it('fills zero only after a complete successful query; failures and malformed results remain unknown', () => {
    expect(socialSiteResponse([['instagram', 7, 12]], true, true).rows).toEqual([
      { platform: 'instagram', visitors: 7, pageviews: 12 }, { platform: 'linkedin', visitors: 0, pageviews: 0 }, { platform: 'x', visitors: 0, pageviews: 0 },
    ])
    for (const result of [null, [['instagram', '7', 12]], [['instagram', -1, 0]]]) {
      expect(socialSiteResponse(result, true, true).rows.every(row => row.visitors === null)).toBe(true)
    }
    expect(socialSiteResponse([], false, true).available).toBe(false)
  })
})
