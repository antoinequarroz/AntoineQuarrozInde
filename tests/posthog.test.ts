import { readFile } from 'node:fs/promises'
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

  it('uses first-party ingestion and captures the four Core Web Vitals', async () => {
    const [nuxtConfig, caddyfile] = await Promise.all([
      readFile('nuxt.config.ts', 'utf8'),
      readFile('Caddyfile', 'utf8'),
    ])

    expect(nuxtConfig).toContain("host: process.env.POSTHOG_HOST || process.env.NUXT_PUBLIC_POSTHOG_HOST || '/ingest'")
    expect(nuxtConfig).toContain("api_host: process.env.NUXT_PUBLIC_POSTHOG_HOST || '/ingest'")
    expect(nuxtConfig).toContain("host: process.env.POSTHOG_INGESTION_HOST || 'https://eu.i.posthog.com'")
    expect(nuxtConfig).toContain('enableExceptionAutocapture: true')
    expect(nuxtConfig).toContain('enabled: Boolean(process.env.POSTHOG_SOURCE_MAP_API_KEY)')
    expect(nuxtConfig).toContain('capture_performance: {')
    expect(nuxtConfig).toContain('web_vitals: true')
    expect(nuxtConfig).toContain("web_vitals_allowed_metrics: ['LCP', 'CLS', 'FCP', 'INP']")
    expect(caddyfile).toContain('handle_path /ingest/*')
    expect(caddyfile).toContain('reverse_proxy https://eu.i.posthog.com')
  })
})
