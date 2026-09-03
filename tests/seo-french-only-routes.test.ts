import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { createApp, toNodeListener } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import frenchOnlyLocalesMiddleware from '../server/middleware/french-only-locales'
import {
  createI18nPagesConfig,
  getFrenchOnlyRedirectLocation,
  isLocalizedRouteVariantApproved,
  LOCALIZED_ROUTE_POLICY,
  type LocalizedRouteFamily,
  validateLocalizedRoutePolicy,
} from '../shared/utils/localizedRoutePolicy'

const execFileAsync = promisify(execFile)
const frenchOnlyProofScript = 'scripts/ops/verify-french-only-routes.sh'

const proofFrenchPaths = [
  '/developpeur-web-valais',
  '/creation-site-internet-valais',
  '/refonte-site-web-valais',
  '/application-mobile-valais',
  '/blog',
  '/cas-clients-valais',
]

const proofDynamicCanaries = [
  '/blog/aq-seo-005-caf%C3%A9%2Farticle',
  '/projets/aq-seo-005-caf%C3%A9%2Fcase',
]

interface ProofFixtureOptions {
  frenchStatus?: number
  localizedStatus?: number
  redirectMutation?: 'wrong-destination' | 'lost-query'
  sitemapVariant?: boolean
  fictionalAlternate?: boolean
  fictionalLanguageLink?: boolean
}

async function closeServer(server: ReturnType<typeof createServer>) {
  await new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })
}

async function runFrenchOnlyProof(options: ProofFixtureOptions = {}) {
  let origin = ''
  const server = createServer((request, response) => {
    const rawTarget = request.url || '/'
    const queryIndex = rawTarget.indexOf('?')
    const pathname = queryIndex === -1 ? rawTarget : rawTarget.slice(0, queryIndex)
    const query = queryIndex === -1 ? '' : rawTarget.slice(queryIndex)

    if (proofFrenchPaths.includes(pathname)) {
      response.statusCode = options.frenchStatus ?? 200
      response.setHeader('content-type', 'text/html; charset=utf-8')
      const languageArtifacts = [
        options.fictionalAlternate
          ? `<link rel="alternate" hreflang="en-US" href="${origin}/en${pathname}">`
          : '',
        options.fictionalLanguageLink
          ? `<a lang="de-CH" href="/de${pathname}">Deutsch</a>`
          : '',
      ].join('')
      response.end(`<!doctype html><html lang="fr-CH"><head><meta name="robots" content="index, follow"><link rel="canonical" href="${origin}${pathname}">${languageArtifacts}</head><body>Page française</body></html>`)
      return
    }

    if (pathname === '/sitemap.xml') {
      response.statusCode = 200
      response.setHeader('content-type', 'application/xml; charset=utf-8')
      const fictionalLocation = options.sitemapVariant
        ? `<url><loc>${origin}/en/projets/etude-fictive</loc></url>`
        : ''
      response.end(`<?xml version="1.0"?><urlset><url><loc>${origin}/blog</loc></url>${fictionalLocation}</urlset>`)
      return
    }

    const localizedMatch = pathname.match(/^\/(?:en|de)(\/.*)$/)
    const frenchPath = localizedMatch?.[1]
    if (frenchPath && [...proofFrenchPaths, ...proofDynamicCanaries].includes(frenchPath)) {
      response.statusCode = options.localizedStatus ?? 308
      if ((options.localizedStatus ?? 308) === 308) {
        let location = `${frenchPath}${query}`
        if (options.redirectMutation === 'wrong-destination') location = '/mauvaise-destination'
        if (options.redirectMutation === 'lost-query') location = frenchPath
        response.setHeader('location', location)
      }
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end('<!doctype html><meta name="robots" content="index, follow"><p>Réponse localisée trompeuse</p>')
      return
    }

    response.statusCode = 404
    response.end('Not found')
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Proof fixture did not expose a TCP port')
    origin = `http://127.0.0.1:${address.port}`
    return await execFileAsync('bash', [frenchOnlyProofScript, origin], { timeout: 15_000 })
  }
  finally {
    await closeServer(server)
  }
}

async function unavailableProofOrigin() {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unavailable fixture did not expose a TCP port')
  const origin = `http://127.0.0.1:${address.port}`
  await closeServer(server)
  return origin
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function policyWithApprovedEnglish(overrides: Partial<LocalizedRouteFamily['variants']['en']> = {}) {
  const source = LOCALIZED_ROUTE_POLICY[0]

  return [{
    ...source,
    variants: {
      ...source.variants,
      fr: { ...source.variants.fr, alternateLocales: ['fr', 'en'] as const },
      en: {
        status: 'approved' as const,
        humanApprovalRef: 'OD-SEO-FUTURE',
        contentRef: 'content/en/web-development',
        metadataRef: 'metadata/en/web-development',
        alternateLocales: ['fr', 'en'] as const,
        ...overrides,
      },
    },
  }] as unknown as LocalizedRouteFamily[]
}

describe('AQ-SEO-005 French-only route policy', () => {
  it('declares the exhaustive set of eight French-only route families', () => {
    expect(LOCALIZED_ROUTE_POLICY.map(family => [family.routeName, family.path])).toEqual([
      ['developpeur-web-valais', '/developpeur-web-valais'],
      ['creation-site-internet-valais', '/creation-site-internet-valais'],
      ['refonte-site-web-valais', '/refonte-site-web-valais'],
      ['application-mobile-valais', '/application-mobile-valais'],
      ['blog', '/blog'],
      ['blog-slug', '/blog/**'],
      ['cas-clients-valais', '/cas-clients-valais'],
      ['projets-slug', '/projets/**'],
    ])

    for (const family of LOCALIZED_ROUTE_POLICY) {
      expect(family.variants.fr.status).toBe('approved')
      expect(family.variants.en.status).toBe('unavailable')
      expect(family.variants.de.status).toBe('unavailable')
    }
  })

  it('builds i18n page restrictions without affecting routes outside the manifest', () => {
    const pages = createI18nPagesConfig()

    expect(Object.keys(pages)).toHaveLength(8)
    for (const family of LOCALIZED_ROUTE_POLICY) {
      expect(pages[family.routeName]).toEqual({ fr: undefined, en: false, de: false })
    }
    expect(pages.index).toBeUndefined()
    expect(pages.confidentialite).toBeUndefined()
    expect(pages['conditions-utilisation']).toBeUndefined()
  })

  it.each([
    ['human approval', { humanApprovalRef: undefined }, 'humanApprovalRef'],
    ['content', { contentRef: undefined }, 'contentRef'],
    ['metadata', { metadataRef: undefined }, 'metadataRef'],
    ['alternate set', { alternateLocales: undefined }, 'alternateLocales'],
  ])('rejects an approved non-French variant without %s evidence', (_label, override, expected) => {
    expect(() => validateLocalizedRoutePolicy(policyWithApprovedEnglish(override)))
      .toThrow(expected)
  })

  it('rejects non-reciprocal alternates between approved locales', () => {
    const policy = policyWithApprovedEnglish({ alternateLocales: ['en'] })

    expect(() => validateLocalizedRoutePolicy(policy))
      .toThrow('complete reciprocal alternate set')
  })

  it('accepts a future non-French variant only with complete approved evidence', () => {
    expect(() => validateLocalizedRoutePolicy(policyWithApprovedEnglish())).not.toThrow()
  })

  it('allows only approved variants for a route family while leaving localized home and legal pages intact', () => {
    for (const family of LOCALIZED_ROUTE_POLICY) {
      const frenchPath = family.path.endsWith('/**')
        ? family.path.replace('/**', '/article-test')
        : family.path

      expect(isLocalizedRouteVariantApproved(frenchPath, 'fr')).toBe(true)
      expect(isLocalizedRouteVariantApproved(frenchPath, 'en')).toBe(false)
      expect(isLocalizedRouteVariantApproved(`/de${frenchPath}`, 'de')).toBe(false)
    }

    for (const path of ['/', '/en', '/de', '/confidentialite', '/en/mentions-legales']) {
      for (const locale of ['fr', 'en', 'de']) {
        expect(isLocalizedRouteVariantApproved(path, locale)).toBe(true)
      }
    }
    expect(isLocalizedRouteVariantApproved('/', 'it')).toBe(false)
  })

  it('filters the language switcher before route resolution and never renders an empty menu or fallback href', async () => {
    const { readFile } = await import('node:fs/promises')
    const switcher = await readFile('app/components/ui/LangSwitcher.vue', 'utf8')
    const policyCheck = switcher.indexOf('isLocalizedRouteVariantApproved(route.path, item.code)')
    const routeResolution = switcher.indexOf('const resolvedRoute = localeRoute({')
    const pathResolution = switcher.indexOf('const path = switchLocalePath(item.code)')

    expect(policyCheck).toBeGreaterThan(-1)
    expect(routeResolution).toBeGreaterThan(policyCheck)
    expect(pathResolution).toBeGreaterThan(routeResolution)
    expect(switcher).toContain("if (!resolvedRoute || resolvedRoute.matched.length === 0) return []")
    expect(switcher).toContain("if (!path || resolvedRoute.fullPath !== path) return []")
    expect(switcher).toContain('<details v-if="available.length"')
    expect(switcher).toContain(':to="item.path"')
    expect(switcher).not.toContain(':to="switchLocalePath(item.code)"')
  })

  it('emits one French sitemap entry per published project and no fictional blog or project locale', async () => {
    const setHeader = vi.fn()
    const eq = vi.fn().mockResolvedValue({
      data: [
        { slug: 'premier-projet', created_at: '2026-01-01T00:00:00.000Z', completed_at: null },
        { slug: 'projet avec espace', created_at: '2026-02-01T00:00:00.000Z', completed_at: '2026-03-01T00:00:00.000Z' },
      ],
      error: null,
    })
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://example.test/' } }))
    vi.stubGlobal('getSupabaseAdmin', () => ({ from }))
    vi.stubGlobal('setHeader', setHeader)

    const { default: sitemapHandler } = await import('../server/routes/sitemap.xml')
    const xml = await sitemapHandler({} as never)
    const projectLocations = [...xml.matchAll(/<loc>([^<]*\/projets\/[^<]+)<\/loc>/g)]
      .map(match => match[1])

    expect(from).toHaveBeenCalledWith('projects')
    expect(select).toHaveBeenCalledWith('slug, created_at, completed_at')
    expect(eq).toHaveBeenCalledWith('case_study_published', true)
    expect(projectLocations).toEqual([
      'https://example.test/projets/premier-projet',
      'https://example.test/projets/projet%20avec%20espace',
    ])
    expect(xml).toContain('<loc>https://example.test/blog</loc>')
    expect(xml).not.toMatch(/<loc>https:\/\/example\.test\/(?:en|de)\/blog<\/loc>/)
    expect(xml).not.toMatch(/<loc>https:\/\/example\.test\/(?:en|de)\/projets\//)
    expect(xml).not.toContain('/cas-clients-valais</loc>')
    expect(setHeader).toHaveBeenCalledWith({}, 'content-type', 'application/xml; charset=UTF-8')
  })

  it.each(['en', 'de'] as const)('redirects every unavailable %s route family to its French path', (locale) => {
    for (const family of LOCALIZED_ROUTE_POLICY) {
      const frenchPath = family.path.endsWith('/**')
        ? family.path.replace('/**', '/article%20test')
        : family.path

      expect(getFrenchOnlyRedirectLocation(`/${locale}${frenchPath}`)).toBe(frenchPath)
      expect(getFrenchOnlyRedirectLocation(`/${locale}${frenchPath}/`)).toBe(`${frenchPath}/`)
      expect(getFrenchOnlyRedirectLocation(`/${locale}${frenchPath}?utm_source=legacy&utm_value=a%2Fb`))
        .toBe(`${frenchPath}?utm_source=legacy&utm_value=a%2Fb`)
    }
  })

  it('preserves an encoded dynamic suffix and query string byte for byte', () => {
    const rawTarget = '/en/blog/caf%C3%A9%2Fmobile/?utm=a%2Fb&utm=c'

    expect(getFrenchOnlyRedirectLocation(rawTarget))
      .toBe('/blog/caf%C3%A9%2Fmobile/?utm=a%2Fb&utm=c')
  })

  it.each([
    '/en/blogue',
    '/en/blog/a/b',
    '/en/projets',
    '/fr/blog',
    '/en/application-mobile-valais-extra',
    '/en/blog//',
  ])('does not intercept the neighbouring path %s', (rawTarget) => {
    expect(getFrenchOnlyRedirectLocation(rawTarget)).toBeNull()
  })

  it.each([
    '',
    'https://evil.example/en/blog',
    '//evil.example/en/blog',
    '/en/blog\\evil',
    '/en/blog\r\nLocation: https://evil.example',
    '/en/blog\0',
    '/en/blog#https://evil.example',
  ])('rejects the unsafe request target %j', (rawTarget) => {
    expect(getFrenchOnlyRedirectLocation(rawTarget)).toBeNull()
  })

  it('keeps encoded authority-like slugs on an internal relative destination', () => {
    expect(getFrenchOnlyRedirectLocation('/de/blog/%2F%2Fevil.example'))
      .toBe('/blog/%2F%2Fevil.example')
  })

  it('stops redirecting a locale once that route variant is approved', () => {
    const policy = policyWithApprovedEnglish()

    expect(getFrenchOnlyRedirectLocation('/en/developpeur-web-valais', policy)).toBeNull()
  })

  it('returns an HTTP 308 with the exact internal Location before route rendering', async () => {
    const app = createApp()
    app.use(frenchOnlyLocalesMiddleware)
    const server = createServer(toNodeListener(app))

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })

    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Test server did not expose a TCP port')

      const response = await fetch(
        `http://127.0.0.1:${address.port}/de/projets/caf%C3%A9%2Fmobile?utm=a%2Fb&utm=c`,
        { redirect: 'manual' },
      )

      expect(response.status).toBe(308)
      expect(response.headers.get('location')).toBe('/projets/caf%C3%A9%2Fmobile?utm=a%2Fb&utm=c')
    }
    finally {
      await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve())
      })
    }
  })

  it('passes the anonymous HTTP proof for French pages, exact redirects and the sitemap', async () => {
    const result = await runFrenchOnlyProof()

    expect(result.stdout).toContain('6 French pages, 16 permanent redirects and 8 sitemap families checked')
  })

  it.each([
    ['a misleading indexable 200 response', { localizedStatus: 200 }],
    ['a temporary redirect', { localizedStatus: 302 }],
    ['a wrong redirect destination', { redirectMutation: 'wrong-destination' }],
    ['a redirect that loses its query', { redirectMutation: 'lost-query' }],
    ['a fictional sitemap variant', { sitemapVariant: true }],
    ['a fictional language link', { fictionalLanguageLink: true }],
    ['a fictional hreflang alternate', { fictionalAlternate: true }],
  ] as const)('fails the HTTP proof on %s', async (_label, options) => {
    await expect(runFrenchOnlyProof(options)).rejects.toMatchObject({ code: 1 })
  })

  it.each([
    'https://user@example.test',
    'https://example.test/unexpected-path',
    'https://example.test?unexpected=query',
  ])('rejects the dangerous origin %s before making a request', async (origin) => {
    await expect(execFileAsync('bash', [frenchOnlyProofScript, origin]))
      .rejects.toMatchObject({ code: 64 })
  })

  it('fails closed when the destination is unavailable', async () => {
    const origin = await unavailableProofOrigin()

    await expect(execFileAsync('bash', [frenchOnlyProofScript, origin], { timeout: 15_000 }))
      .rejects.toMatchObject({ code: expect.any(Number) })
  })
})
