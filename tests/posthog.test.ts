import { describe, expect, it } from 'vitest'
import { analyticsContent, isPostHogProductionHost, isPostHogPublicPath, safeAnalyticsPath, stripAnalyticsUrlQuery } from '../app/utils/posthog'

describe('PostHog public analytics scope', () => {
  it('tracks public marketing and content pages', () => {
    expect(isPostHogPublicPath('/')).toBe(true)
    expect(isPostHogPublicPath('/projets/une-etude')).toBe(true)
    expect(isPostHogPublicPath('/blog/article')).toBe(true)
  })

  it('does not track private admin or client routes', () => {
    expect(isPostHogPublicPath('/admin')).toBe(false)
    expect(isPostHogPublicPath('/admin/invoices')).toBe(false)
    expect(isPostHogPublicPath('/portal')).toBe(false)
    expect(isPostHogPublicPath('/portal/login')).toBe(false)
  })

  it('sends events only from the production domain', () => {
    expect(isPostHogProductionHost('www.antoinequarroz.ch')).toBe(true)
    expect(isPostHogProductionHost('antoinequarroz.ch')).toBe(true)
    expect(isPostHogProductionHost('localhost')).toBe(false)
    expect(isPostHogProductionHost('preview.example.com')).toBe(false)
  })

  it('removes query parameters before URLs reach analytics', () => {
    expect(safeAnalyticsPath('/blog/article?email=private@example.com')).toBe('/blog/article')
    expect(stripAnalyticsUrlQuery('https://www.antoinequarroz.ch/contact?token=secret')).toBe('https://www.antoinequarroz.ch/contact')
  })

  it('classifies articles and projects without keeping their query string', () => {
    expect(analyticsContent('/blog/mon-article?utm_source=linkedin')).toEqual({ type: 'article', slug: 'mon-article' })
    expect(analyticsContent('/projets/hermes-cockpit')).toEqual({ type: 'project', slug: 'hermes-cockpit' })
    expect(analyticsContent('/contact')).toEqual({ type: 'page', slug: null })
  })
})
