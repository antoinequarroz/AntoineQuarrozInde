import { describe, expect, it } from 'vitest'
import { classifyAcquisition, classifyStoredAcquisitionSource } from '../shared/utils/acquisitionChannel'
import { marketingMetadataPayload } from '../server/utils/marketingMetadata'

describe('AQ-SEO-015 acquisition channels', () => {
  it.each([
    [{ referrerHost: 'www.google.ch' }, 'organic_search'],
    [{ utmSource: 'BING' }, 'organic_search'],
    [{ referrerHost: 'chatgpt.com' }, 'generative_ai'],
    [{ referrerHost: 'www.perplexity.ai' }, 'generative_ai'],
    [{ utmSource: 'Claude' }, 'generative_ai'],
    [{}, 'direct'],
    [{ utmSource: 'newsletter' }, 'campaign'],
    [{ referrerHost: 'example.org' }, 'unknown_referral'],
  ])('classifies %o as %s', (input, expected) => {
    expect(classifyAcquisition(input)).toBe(expected)
  })

  it('does not accept lookalike domains or arbitrary event metadata', () => {
    expect(classifyAcquisition({ referrerHost: 'chatgpt.com.evil.test' })).toBe('unknown_referral')
    expect(classifyAcquisition({ referrerHost: 'google.ch.evil.test' })).toBe('unknown_referral')
    expect(marketingMetadataPayload({ acquisitionChannel: 'generative_ai', email: 'private@example.org', arbitrary: 'x' })).toEqual({ acquisitionChannel: 'generative_ai' })
    expect(marketingMetadataPayload({ acquisitionChannel: 'made-up', projectId: 12, slug: ' case ' })).toEqual({ projectId: 12, slug: 'case' })
  })

  it('classifies historical stored sources conservatively', () => {
    expect(classifyStoredAcquisitionSource('direct')).toBe('direct')
    expect(classifyStoredAcquisitionSource('google.ch')).toBe('organic_search')
    expect(classifyStoredAcquisitionSource('chatgpt.com')).toBe('generative_ai')
    expect(classifyStoredAcquisitionSource('newsletter')).toBe('campaign')
    expect(classifyStoredAcquisitionSource('partner.example')).toBe('unknown_referral')
  })
})
