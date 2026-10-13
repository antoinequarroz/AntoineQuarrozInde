import { glob, readFile, stat } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import { pwaPrecachePatterns, shouldCachePublicImage, shouldUsePublicOfflineFallback } from '../shared/utils/pwaCachePolicy'

vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
const config = (await import('../nuxt.config')).default

function navigation(path: string, origin = 'https://www.antoinequarroz.ch') {
  return { request: { mode: 'navigate' }, url: new URL(path, origin), sameOrigin: origin === 'https://www.antoinequarroz.ch' }
}

describe('public PWA cache boundaries', () => {
  it('does not install the article, social or portfolio media library', async () => {
    const files = []
    for await (const file of glob(pwaPrecachePatterns, { cwd: 'public' })) files.push(file)

    expect(files).toContain('offline.htm')
    expect(files).toContain('apple-touch-icon.png')
    expect(files.some(file => /^(?:article-media|social|showcase-tools|case-studies|portfolio-previews|videos)\//.test(file))).toBe(false)
    const bytes = (await Promise.all(files.map(file => stat(`public/${file}`)))).reduce((sum, info) => sum + info.size, 0)
    expect(bytes).toBeLessThan(50_000)
  })

  it('keeps public SSR on the network and only falls back on a network failure', () => {
    const worker = config.pwa.workbox
    expect(worker.navigateFallback).toBeNull()
    const rule = worker.runtimeCaching.find(rule => rule.urlPattern === shouldUsePublicOfflineFallback)
    expect(rule?.handler).toBe('NetworkOnly')
    expect(rule?.options.precacheFallback?.fallbackURL).toBe('/offline.htm')
    for (const path of ['/', '/blog', '/blog/un-article', '/en', '/de/services']) {
      expect(shouldUsePublicOfflineFallback(navigation(path)), path).toBe(true)
    }
  })

  it('never handles private pages, APIs, ingestion or cross-origin navigations', () => {
    for (const path of ['/admin', '/admin/login', '/admin/clients/123', '/portal', '/portal/setup?token=private', '/api', '/api/contact', '/ingest', '/ingest/e/', '/en/admin/login', '/de/portal/login']) {
      expect(shouldUsePublicOfflineFallback(navigation(path)), path).toBe(false)
    }
    expect(shouldUsePublicOfflineFallback(navigation('/', 'https://example.com'))).toBe(false)
    expect(shouldUsePublicOfflineFallback({ ...navigation('/'), request: { mode: 'cors' } })).toBe(false)
  })

  it('caches only requested public images with a bounded, revalidating strategy', () => {
    const rule = config.pwa.workbox.runtimeCaching.find(rule => rule.urlPattern === shouldCachePublicImage)
    expect(rule?.handler).toBe('StaleWhileRevalidate')
    expect(rule?.options.expiration).toEqual({ maxEntries: 40, maxAgeSeconds: 2_592_000 })
    expect(rule?.options.cacheableResponse?.statuses).toEqual([200])
    for (const path of ['/portfolio-previews/lifxp-720.webp', '/article-media/example/cover.png', '/videos/presentation/affiche-portrait.webp']) {
      expect(shouldCachePublicImage({ ...navigation(path), request: { mode: 'no-cors', destination: 'image' } })).toBe(true)
    }
    for (const path of ['/admin/client.png', '/portal/invoice.jpg', '/api/uploads/image.png', '/videos/presentation/antoine-portrait.mp4', '/article-media/example/index.html']) {
      expect(shouldCachePublicImage({ ...navigation(path), request: { mode: 'no-cors', destination: 'image' } })).toBe(false)
    }
    expect(shouldCachePublicImage({ ...navigation('/article-media/example/cover.png', 'https://example.com'), request: { mode: 'no-cors', destination: 'image' } })).toBe(false)
  })

  it('has a self-contained offline shell without external dependencies', async () => {
    const html = await readFile('public/offline.htm', 'utf8')
    expect(html).toContain('Connexion interrompue')
    expect(html).toContain('noindex,nofollow')
    expect(html).not.toMatch(/<(?:script|link|img)\b/i)
    expect(Buffer.byteLength(html)).toBeLessThan(5_000)
  })
})
