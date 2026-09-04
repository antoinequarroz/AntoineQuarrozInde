import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

import {
  normalizePublicSiteOrigin,
  PUBLIC_COUNTRY_LABELS,
  PUBLIC_SEO_IDENTITY,
  resolvePublicSocialImage,
  serializeJsonLd,
} from '../shared/utils/publicSeoIdentity'
import { sitemapStaticPaths } from '../server/utils/sitemapDiscovery'

const execFileAsync = promisify(execFile)
const proofServers: Array<ReturnType<typeof createServer>> = []
const unixIt = process.platform === 'win32' ? it.skip : it

type ProofVariant = 'valid' | 'missing-alt' | 'identity-divergence' | 'unsafe-image' | 'inaccessible-image'

afterEach(async () => {
  await Promise.all(proofServers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })))
})

async function startProofServer(variant: ProofVariant) {
  const server = createServer((request, response) => {
    const address = server.address() as { port: number }
    const origin = `http://127.0.0.1:${address.port}`
    const image = variant === 'unsafe-image'
      ? 'https://evil.test/social.jpg'
      : `${origin}/${variant === 'inaccessible-image' ? 'missing.jpg' : 'about.jpg'}`
    const socialMeta = [
      `<meta property="og:image" content="${image}">`,
      variant === 'missing-alt' ? '' : '<meta property="og:image:alt" content="Portrait d’Antoine Quarroz">',
      `<meta name="twitter:image" content="${image}">`,
      '<meta name="twitter:image:alt" content="Portrait d’Antoine Quarroz">',
    ].join('')
    const identity = {
      '@context': 'https://schema.org',
      '@graph': ['Person', 'ProfessionalService'].map(type => ({
        '@type': type,
        '@id': `${origin}/#${type === 'Person' ? 'person' : 'business'}`,
        name: variant === 'identity-divergence' ? 'Different Person' : 'Antoine Quarroz',
        email: 'mailto:info@antoinequarroz.ch',
        telephone: '+41791576450',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Rue de l’Evouette 5',
          postalCode: '1969',
          addressLocality: 'Saint-Martin',
          addressRegion: 'Valais',
          addressCountry: 'CH',
        },
        sameAs: [
          'https://github.com/antoinequarroz',
          'https://www.linkedin.com/in/antoine-quarroz-376020187/',
        ],
      })),
    }
    const visibleIdentity = '<footer>Antoine Quarroz info@antoinequarroz.ch +41 79 157 64 50 Rue de l’Evouette 5 1969 Saint-Martin Valais<a href="mailto:info@antoinequarroz.ch">Email</a><a href="tel:+41791576450">Phone</a><a href="https://github.com/antoinequarroz">GitHub</a><a href="https://www.linkedin.com/in/antoine-quarroz-376020187/">LinkedIn</a></footer>'
    const page = (withIdentity: boolean) => `<!doctype html><html><head>${socialMeta}${withIdentity ? `<script type="application/ld+json">${JSON.stringify(identity)}</script>` : ''}</head><body>${withIdentity ? visibleIdentity : '<h1>Project</h1>'}</body></html>`

    if (request.url === '/sitemap.xml') {
      response.setHeader('content-type', 'application/xml')
      response.end(`<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/projets/demo</loc></url></urlset>`)
      return
    }
    if (request.url === '/' || request.url === '/projets/demo') {
      response.setHeader('content-type', 'text/html; charset=UTF-8')
      response.end(page(request.url === '/'))
      return
    }
    if (request.url === '/about.jpg') {
      response.setHeader('content-type', 'image/jpeg')
      response.end('image')
      return
    }
    response.statusCode = 404
    response.end()
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  proofServers.push(server)
  const address = server.address() as { port: number }
  return `http://127.0.0.1:${address.port}`
}

function runProof(origin: string) {
  return execFileAsync('bash', ['scripts/ops/verify-identity-social.sh', origin], { cwd: process.cwd() })
}

describe('AQ-SEO-008 public identity and social previews', () => {
  it('keeps the approved, already-visible identity in one public source', () => {
    expect(PUBLIC_SEO_IDENTITY).toMatchObject({
      name: 'Antoine Quarroz',
      email: 'info@antoinequarroz.ch',
      phone: '+41 79 157 64 50',
      telephone: '+41791576450',
      address: {
        streetAddress: 'Rue de l’Evouette 5',
        postalCode: '1969',
        addressLocality: 'Saint-Martin',
        addressRegion: 'Valais',
        addressCountry: 'CH',
      },
      defaultSocialImagePath: '/about.jpg',
    })
    expect(PUBLIC_SEO_IDENTITY.profiles.map(profile => profile.href)).toEqual([
      'https://github.com/antoinequarroz',
      'https://www.linkedin.com/in/antoine-quarroz-376020187/',
    ])
    expect(PUBLIC_COUNTRY_LABELS).toEqual({ fr: 'Suisse', en: 'Switzerland', de: 'Schweiz' })
  })

  it('normalizes only a clean HTTP(S) site origin', () => {
    expect(normalizePublicSiteOrigin('https://www.antoinequarroz.ch/')).toBe('https://www.antoinequarroz.ch')
    expect(normalizePublicSiteOrigin('http://127.0.0.1:3104')).toBe('http://127.0.0.1:3104')
    expect(() => normalizePublicSiteOrigin('https://user@example.com')).toThrow('public_site_origin_invalid')
    expect(() => normalizePublicSiteOrigin('https://example.com/path')).toThrow('public_site_origin_invalid')
  })

  it('resolves approved image forms and falls back from unsafe values', () => {
    const origin = 'https://www.antoinequarroz.ch'
    expect(resolvePublicSocialImage(origin, '/media/project.jpg')).toEqual({
      url: `${origin}/media/project.jpg`,
      isFallback: false,
    })
    expect(resolvePublicSocialImage(origin, 'https://project.supabase.co/storage/v1/object/public/media/image.jpg')).toEqual({
      url: 'https://project.supabase.co/storage/v1/object/public/media/image.jpg',
      isFallback: false,
    })
    for (const value of [undefined, '', 'javascript:alert(1)', 'data:image/png;base64,test', '//evil.test/a.jpg', 'http://evil.test/a.jpg', 'https://user:pass@evil.test/a.jpg', 'not a URL']) {
      expect(resolvePublicSocialImage(origin, value)).toEqual({
        url: `${origin}/about.jpg`,
        isFallback: true,
      })
    }
  })

  it('serializes JSON-LD without allowing script termination', () => {
    const serialized = serializeJsonLd({ name: '</script><img src=x>', separator: '\u2028' })
    expect(JSON.parse(serialized)).toEqual({ name: '</script><img src=x>', separator: '\u2028' })
    expect(serialized).not.toContain('<')
    expect(serialized).not.toContain('>')
    expect(serialized).not.toContain('\u2028')
  })

  it('wires the shared identity, localized defaults and dynamic image fallback', async () => {
    const [app, home, footer, article, project, catalogs] = await Promise.all([
      readFile('app/app.vue', 'utf8'),
      readFile('app/pages/index.vue', 'utf8'),
      readFile('app/components/layout/AppFooter.vue', 'utf8'),
      readFile('app/pages/blog/[slug].vue', 'utf8'),
      readFile('app/pages/projets/[slug].vue', 'utf8'),
      Promise.all(['fr', 'en', 'de'].map(locale => readFile(`i18n/locales/${locale}.json`, 'utf8').then(JSON.parse))),
    ])

    expect(sitemapStaticPaths).toHaveLength(18)
    expect(app).toContain('resolvePublicSocialImage')
    expect(app).toContain('ogImageAlt')
    expect(app).toContain('twitterImageAlt')
    expect(home).toContain('PUBLIC_SEO_IDENTITY')
    expect(home).toContain('serializeJsonLd')
    expect(footer).toContain('PUBLIC_SEO_IDENTITY')
    expect(article).toContain('resolvePublicSocialImage')
    expect(article).toContain('ogImageAlt')
    expect(project).toContain('resolvePublicSocialImage')
    expect(project).toContain('ogImageAlt')

    for (const catalog of catalogs) {
      expect(catalog.seo.social.default_image_alt).toBeTruthy()
      expect(catalog.seo.social.article_image_alt).toContain('{title}')
      expect(catalog.seo.social.project_image_alt).toContain('{title}')
    }
  })

  unixIt('accepts matching identity and accessible social images on sitemap pages', async () => {
    const origin = await startProofServer('valid')
    const result = await runProof(origin)
    expect(result.stdout).toContain('Identity and social previews are valid on 2 indexable pages')
  })

  unixIt.each([
    ['a missing image alt', 'missing-alt'],
    ['structured identity divergence', 'identity-divergence'],
    ['an unapproved image host', 'unsafe-image'],
    ['an inaccessible image', 'inaccessible-image'],
  ] as const)('rejects %s', async (_label, variant) => {
    const origin = await startProofServer(variant)
    await expect(runProof(origin)).rejects.toMatchObject({ code: 1 })
  })

  unixIt('rejects an unsafe origin before making a request', async () => {
    await expect(runProof('https://user@example.com')).rejects.toMatchObject({ code: 64 })
  })
})
