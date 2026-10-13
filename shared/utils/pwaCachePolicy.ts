type CacheRequest = {
  request: { mode: string; destination?: string }
  url: URL
  sameOrigin: boolean
}

// Installation needs only the small shell. Content images are fetched and
// cached when viewed, rather than downloading the complete media library.
export const pwaPrecachePatterns = [
  '_nuxt/**/*.css',
  '_nuxt/**/*.woff2',
  'fonts/**/*.woff2',
  'favicon.ico',
  'favicon.svg',
  'favicon-48x48.png',
  'favicon-96x96.png',
  'apple-touch-icon.png',
  // Nuxt's PWA integration rewrites .html URLs to SSR routes. .htm keeps this
  // static, self-contained response addressable in the generated precache.
  'offline.htm',
]

// These callbacks must stay self-contained: Workbox serializes their source
// into the generated service worker, without this module's lexical scope.
export function shouldUsePublicOfflineFallback({ request, url, sameOrigin }: CacheRequest) {
  return sameOrigin
    && request.mode === 'navigate'
    && !/^\/(?:(?:en|de)\/)?(?:admin|portal|api|ingest)(?:\/|$)/i.test(url.pathname)
}

export function shouldCachePublicImage({ request, url, sameOrigin }: CacheRequest) {
  return sameOrigin
    && request.destination === 'image'
    && /^\/(?:article-media|social|showcase-tools|case-studies|portfolio-previews|projects|videos\/presentation)\/[^?]+\.(?:avif|webp|png|jpe?g|svg)$/i.test(url.pathname)
}
