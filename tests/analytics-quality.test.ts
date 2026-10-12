import { afterEach, describe, expect, it, vi } from 'vitest'
import { classifyBusinessIdentity, excludeInternalVisit } from '../shared/utils/analyticsQuality'
import { createAnalyticsJourney, publicJourneyProperties } from '../app/utils/analyticsJourney'
import { buildPostHogBusinessPayload } from '../server/utils/posthogBusiness'
import { buildPostHogMarketingReport } from '../server/utils/posthogMarketing'

afterEach(() => vi.unstubAllGlobals())

describe('acquisition data quality', () => {
  it('separates explicit test identities from real clients and missing evidence', () => {
    expect(classifyBusinessIdentity({ name: 'TEST technique — Antoine', email: 'info@antoinequarroz.ch' })).toBe('test')
    expect(classifyBusinessIdentity({ name: 'Client', email: 'recette@example.invalid' })).toBe('test')
    expect(classifyBusinessIdentity({ name: 'Cabinet réel', email: 'contact@cabinet.ch' })).toBe('production')
    expect(classifyBusinessIdentity(null)).toBe('unclassified')
    const payload = buildPostHogBusinessPayload({ event: 'quote_accepted', origin: 'quote_status_change', organizationId: 'org', entityType: 'quote', entityId: 1, trafficClassification: 'test' }, 'fixture')
    expect(payload.properties.traffic_classification).toBe('test')
    expect(JSON.stringify(payload)).not.toContain('recette@example.invalid')
    expect(buildPostHogBusinessPayload({ event: 'quote_accepted', origin: 'quote_status_change', organizationId: 'org', entityType: 'quote', entityId: 2 }, 'fixture').properties.traffic_classification).toBe('unclassified')
  })

  it('excludes staff, automated browsers and explicitly opted-out visits', () => {
    const publicVisit = { staff: false, webdriver: false, userAgent: 'Mozilla/5.0', optedOut: false }
    expect(excludeInternalVisit(publicVisit)).toBe(false)
    expect(excludeInternalVisit({ ...publicVisit, staff: true })).toBe(true)
    expect(excludeInternalVisit({ ...publicVisit, webdriver: true })).toBe(true)
    expect(excludeInternalVisit({ ...publicVisit, userAgent: 'HeadlessChrome/140' })).toBe(true)
    expect(excludeInternalVisit({ ...publicVisit, optedOut: true })).toBe(true)
  })

  it('keeps the session entry page and source across navigation without retaining private queries', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('sessionStorage', { getItem: (k: string) => values.get(k), setItem: (k: string, v: string) => values.set(k, v) })
    vi.stubGlobal('window', { location: { search: '?utm_source=linkedin&email=private@example.com' } })
    vi.stubGlobal('document', { referrer: 'https://www.linkedin.com/feed/?private=secret' })
    const entry = publicJourneyProperties('/blog/guide?token=secret')
    expect(publicJourneyProperties('/#contact-form')).toEqual(entry)
    expect(entry).toMatchObject({ entry_path: '/blog/guide', entry_source: 'linkedin', entry_channel: 'campaign' })
    expect(JSON.stringify(entry)).not.toMatch(/secret|private@example/)
    expect(createAnalyticsJourney({ id: 'fixture', path: '/', utmSource: 'private@example.com', referrer: 'https://www.google.com/' }).entry_source).toBe('www.google.com')
  })

  it('reports excluded history and a sequential journey separately from global counters', async () => {
    const calls: string[] = []
    vi.stubGlobal('$fetch', async (_url: string, options: any) => {
      const name = options.body.name; const sql = options.body.query.query; calls.push(sql)
      if (name === 'hermes_marketing_weekly') return { results: [['current', 20, 30, 12, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0]] }
      if (name === 'hermes_marketing_journeys') return { results: [['/creation-site-internet-valais', 'google', 10, 3, 2, 1]] }
      if (name === 'hermes_marketing_quality') return { results: [[5, 12, 4, 8]] }
      return { results: [] }
    })
    const result = await buildPostHogMarketingReport('fixture', 'project')
    expect(result.current.acceptedQuotes).toBe(0)
    expect(result.dataQuality).toMatchObject({ excludedBusinessTests: 5, unclassifiedBusinessEvents: 12 })
    expect(result.journeys.rows[0]).toMatchObject({ visits: 10, contactIntents: 3, formStarted: 2, contacts: 1 })
    expect(result.alerts.some(a => a.key === 'crm_gap')).toBe(false)
    expect(calls.some(sql => sql.includes('windowFunnel(86400)') && sql.includes('GROUP BY distinct_id, journey'))).toBe(true)
    expect(calls.filter(sql => !sql.includes('hermes_marketing_quality')).every(sql => sql.includes('traffic_classification'))).toBe(true)
  })
})
