import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createSocialDocumentPreviewLoader, socialDocumentManifestUrl, validateSocialDocumentManifest } from '../app/utils/socialDocumentPreview'

const pdf = 'https://www.antoinequarroz.ch/social/physiobaur-projet-dark-v2.pdf'
function manifest(count: number) {
  return { schemaVersion: 1, pages: Array.from({ length: count }, (_, index) => ({ src: `slide-${index + 1}.png`, alt: `Page ${index + 1}` })) }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('document preview manifests', () => {
  it('derives the sidecar URL and the exact number of pages for both six-page and legacy seven-page documents', () => {
    expect(socialDocumentManifestUrl(pdf)).toBe('https://www.antoinequarroz.ch/social/physiobaur-projet-dark-v2/manifest.json')
    for (const count of [6, 7]) {
      const pages = validateSocialDocumentManifest(manifest(count), pdf)
      expect(pages).toHaveLength(count)
      expect(pages.at(-1)).toEqual({ src: `https://www.antoinequarroz.ch/social/physiobaur-projet-dark-v2/slide-${count}.png`, alt: `Page ${count}` })
    }
    const legacy = JSON.parse(readFileSync(new URL('../public/social/carousel-ia-pme-pilote-30-jours/manifest.json', import.meta.url), 'utf8'))
    expect(validateSocialDocumentManifest(legacy, 'https://www.antoinequarroz.ch/social/carousel-ia-pme-pilote-30-jours.pdf')).toHaveLength(7)
  })
  it('rejects incomplete, excessive, reordered and externally addressed pages', () => {
    for (const value of [null, [], {}, { ...manifest(6), schemaVersion: 2 }, manifest(0), manifest(51)]) {
      expect(() => validateSocialDocumentManifest(value, pdf)).toThrow()
    }
    for (const src of ['https://evil.example/slide-1.png', '//evil.example/slide-1.png', '../slide-1.png', '/social/slide-1.png', 'slide-1.png?url=external', 'slide-1.png#fragment', 'slide-2.png']) {
      const value = manifest(6); value.pages[0]!.src = src
      expect(() => validateSocialDocumentManifest(value, pdf)).toThrow()
    }
    const noAlt = manifest(6); noAlt.pages[0]!.alt = ' '
    expect(() => validateSocialDocumentManifest(noAlt, pdf)).toThrow()
  })
  it('never derives a manifest URL from an external or privately parameterized PDF', () => {
    for (const url of ['https://evil.example/social/file.pdf', 'javascript:alert(1)', 'http://www.antoinequarroz.ch/social/a.pdf', 'https://user:password@www.antoinequarroz.ch/social/a.pdf', `${pdf}?token=private`, `${pdf}#page=2`, 'https://www.antoinequarroz.ch/social/%2e%2e/private.pdf', 'https://www.antoinequarroz.ch/social/a%2f..%2fprivate.pdf']) {
      expect(() => socialDocumentManifestUrl(url)).toThrow()
    }
  })
  it('returns an unavailable state for a missing, failed or malformed manifest without inventing any pages', async () => {
    for (const fetcher of [vi.fn().mockRejectedValue(new Error('404')), vi.fn().mockRejectedValue(new Error('network')), vi.fn().mockResolvedValue({ pages: [] })]) {
      expect(await createSocialDocumentPreviewLoader(fetcher).load(pdf)).toEqual({ state: 'unavailable', pages: [] })
    }
  })
  it('aborts the previous PDF request and ignores its late successful result', async () => {
    const previous = deferred<unknown>(), current = deferred<unknown>()
    const fetcher = vi.fn().mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise)
    const loader = createSocialDocumentPreviewLoader(fetcher)
    const oldResult = loader.load('https://www.antoinequarroz.ch/social/old.pdf')
    const newResult = loader.load(pdf)
    expect(fetcher.mock.calls[0]![1].signal.aborted).toBe(true)
    current.resolve(manifest(6))
    expect(await newResult).toMatchObject({ state: 'ready', pages: expect.arrayContaining([{ src: 'https://www.antoinequarroz.ch/social/physiobaur-projet-dark-v2/slide-6.png', alt: 'Page 6' }]) })
    previous.resolve(manifest(7))
    expect(await oldResult).toEqual({ state: 'stale', pages: [] })
  })
  it('ignores errors from the previous document and responses after disposal', async () => {
    const previous = deferred<unknown>(), current = deferred<unknown>()
    const loader = createSocialDocumentPreviewLoader(vi.fn().mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise))
    const oldResult = loader.load('https://www.antoinequarroz.ch/social/old.pdf')
    const newResult = loader.load(pdf)
    previous.reject(new Error('aborted'))
    expect(await oldResult).toEqual({ state: 'stale', pages: [] })
    loader.cancel()
    current.resolve(manifest(6))
    expect(await newResult).toEqual({ state: 'stale', pages: [] })
  })
})
