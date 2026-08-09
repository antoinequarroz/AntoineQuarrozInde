import { describe, expect, it } from 'vitest'
import { leadAttributionPayload } from '../server/utils/leadAttribution'

describe('lead attribution payload', () => {
  it('accepts only known string fields and trims them', () => {
    expect(leadAttributionPayload({
      landingPath: ' /contact ',
      referrerHost: ' google.ch ',
      utmSource: ' newsletter ',
      ignored: 'secret',
    })).toEqual({
      landing_path: '/contact', referrer_host: 'google.ch', utm_source: 'newsletter',
      utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null,
    })
  })

  it('does not serialize objects or unbounded values', () => {
    const result = leadAttributionPayload({ utmSource: { nested: true }, utmCampaign: 'x'.repeat(300) })
    expect(result.utm_source).toBeNull()
    expect(result.utm_campaign).toHaveLength(180)
  })
})
