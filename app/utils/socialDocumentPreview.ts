export type SocialDocumentPage = { src: string, alt: string }
type ManifestFetcher = (url: string, options: { signal: AbortSignal }) => Promise<unknown>
export type SocialDocumentPreviewResult =
  | { state: 'ready', pages: SocialDocumentPage[] }
  | { state: 'unavailable' | 'stale', pages: [] }

export function socialDocumentManifestUrl(pdfUrl: string) {
  const url = new URL(pdfUrl)
  const decodedPath = decodeURIComponent(url.pathname)
  if (url.origin !== 'https://www.antoinequarroz.ch' || url.username || url.password || url.search || url.hash
    || !url.pathname.startsWith('/social/') || !/\.pdf$/i.test(url.pathname)
    || decodedPath.includes('\\') || decodedPath.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('Adresse de document invalide.')
  }
  url.pathname = `${url.pathname.slice(0, -4)}/manifest.json`
  return url.href
}

export function validateSocialDocumentManifest(value: unknown, pdfUrl: string): SocialDocumentPage[] {
  const manifestUrl = socialDocumentManifestUrl(pdfUrl)
  const manifest = value as { schemaVersion?: unknown, pages?: unknown }
  if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.pages) || manifest.pages.length < 1 || manifest.pages.length > 50) {
    throw new Error('Le manifeste du carrousel est invalide.')
  }
  return manifest.pages.map((value, index) => {
    const page = value as { src?: unknown, alt?: unknown }
    if (!page || page.src !== `slide-${index + 1}.png` || typeof page.alt !== 'string' || !page.alt.trim() || page.alt.length > 500) {
      throw new Error('Les pages du carrousel sont invalides.')
    }
    return { src: new URL(page.src as string, manifestUrl).href, alt: page.alt.trim() }
  })
}

// A document may be replaced while its former manifest is still in flight.
// The request identity protects the UI even if a fetcher ignores cancellation.
export function createSocialDocumentPreviewLoader(fetchManifest: ManifestFetcher) {
  let revision = 0
  let active: AbortController | undefined
  return {
    async load(pdfUrl: string): Promise<SocialDocumentPreviewResult> {
      const request = ++revision
      active?.abort()
      const controller = new AbortController()
      active = controller
      try {
        const data = await fetchManifest(socialDocumentManifestUrl(pdfUrl), { signal: controller.signal })
        if (request !== revision) return { state: 'stale', pages: [] }
        return { state: 'ready', pages: validateSocialDocumentManifest(data, pdfUrl) }
      }
      catch {
        return { state: request === revision ? 'unavailable' : 'stale', pages: [] }
      }
    },
    cancel() {
      revision++
      active?.abort()
    },
  }
}
