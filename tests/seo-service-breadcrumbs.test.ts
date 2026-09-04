import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

import {
  resolvePublicBreadcrumbTrail,
  resolvePublicService,
} from '../shared/utils/publicStructuredData'

const execFileAsync = promisify(execFile)
const proofServers: Array<ReturnType<typeof createServer>> = []
const unixIt = process.platform === 'win32' ? it.skip : it
const servicePaths = [
  '/developpeur-web-valais',
  '/creation-site-internet-valais',
  '/refonte-site-web-valais',
  '/application-mobile-valais',
]

type ProofVariant =
  | 'valid'
  | 'valid-no-deep-content'
  | 'missing-service'
  | 'missing-service-page'
  | 'service-divergence'
  | 'provider-divergence'
  | 'area-divergence'
  | 'forbidden-property'
  | 'missing-breadcrumb'
  | 'breadcrumb-divergence'
  | 'position-divergence'
  | 'canonical-divergence'
  | 'invalid-json'
  | 'redirect'

afterEach(async () => {
  await Promise.all(proofServers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })))
})

function proofTrail(origin: string, path: string, name: string) {
  const parents = path.startsWith('/blog/')
    ? [{ name: 'Accueil', path: '/' }, { name: 'Blog', path: '/blog' }]
    : path.startsWith('/projets/')
      ? [{ name: 'Accueil', path: '/' }, { name: 'Cas clients', path: '/cas-clients-valais' }]
      : [{ name: 'Accueil', path: '/' }]
  return resolvePublicBreadcrumbTrail(origin, [...parents, { name, path }])
}

function visibleTrail(trail: ReturnType<typeof proofTrail>) {
  const items = trail.items.map((item, index) => {
    const content = index < trail.items.length - 1
      ? `<a data-breadcrumb-link href="${item.path}">${item.name}</a><span aria-hidden="true">/</span>`
      : `<span data-breadcrumb-current aria-current="page">${item.name}</span>`
    return `<li data-breadcrumb-item>${content}</li>`
  }).join('')
  return `<nav data-breadcrumbs aria-label="Fil d’Ariane"><ol>${items}</ol></nav>`
}

async function startProofServer(variant: ProofVariant) {
  const server = createServer((request, response) => {
    const address = server.address() as { port: number }
    const origin = `http://127.0.0.1:${address.port}`
    const dynamicPaths = variant === 'valid-no-deep-content' ? [] : ['/blog/article-test', '/projets/projet-test']
    const paths = [
      ...servicePaths.filter(path => variant !== 'missing-service-page' || path !== servicePaths.at(-1)),
      ...dynamicPaths,
    ]

    if (request.url === '/sitemap.xml') {
      response.setHeader('content-type', 'application/xml')
      response.end(`<urlset>${paths.map(path => `<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`)
      return
    }
    if (!request.url || !paths.includes(request.url)) {
      response.statusCode = 404
      response.end()
      return
    }
    if (variant === 'redirect' && request.url === servicePaths[0]) {
      response.statusCode = 302
      response.setHeader('location', '/')
      response.end()
      return
    }

    const path = request.url
    const isService = servicePaths.includes(path)
    const name = isService
      ? `Service ${servicePaths.indexOf(path) + 1} en Valais`
      : path.startsWith('/blog/') ? 'Article test' : 'Projet test'
    const description = `Description publique de ${name}.`
    const canonical = `${origin}${path}`
    const canonicalLink = variant === 'canonical-divergence' && path === servicePaths[0]
      ? `${origin}/autre-page`
      : canonical
    const trail = proofTrail(origin, path, name)
    const breadcrumb = variant === 'breadcrumb-divergence' && path === servicePaths[0]
      ? {
          ...trail.jsonLd,
          itemListElement: trail.jsonLd.itemListElement.map((item, index) => index === 1 ? { ...item, name: 'Autre service' } : item),
        }
      : variant === 'position-divergence' && path === servicePaths[0]
        ? {
            ...trail.jsonLd,
            itemListElement: trail.jsonLd.itemListElement.map((item, index) => index === 1 ? { ...item, position: 3 } : item),
          }
      : trail.jsonLd
    const service = resolvePublicService(origin, {
      name,
      serviceType: name,
      description: variant === 'service-divergence' && path === servicePaths[0] ? 'Description structurée différente.' : description,
      path,
      areaServed: 'Valais',
    })
    const serviceNode = variant === 'forbidden-property' && path === servicePaths[0]
      ? { ...service, offers: { '@type': 'Offer', price: 100 } }
      : variant === 'provider-divergence' && path === servicePaths[0]
        ? { ...service, provider: { ...service.provider, name: 'Autre prestataire' } }
        : variant === 'area-divergence' && path === servicePaths[0]
          ? { ...service, areaServed: { ...service.areaServed, name: 'Monde' } }
          : service
    const graph = [
      ...(isService && !(variant === 'missing-service' && path === servicePaths[0]) ? [serviceNode] : []),
      breadcrumb,
      ...(!isService ? [{ '@type': path.startsWith('/blog/') ? 'BlogPosting' : 'CreativeWork', name, url: canonical }] : []),
    ]
    const jsonLd = variant === 'invalid-json' && path === servicePaths[0]
      ? '{invalid'
      : JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
    const breadcrumbs = variant === 'missing-breadcrumb' && path === servicePaths[0]
      ? ''
      : visibleTrail(trail)
    const body = isService
      ? `<h1 data-service-name>${name}</h1><p data-service-description>${description}</p>`
      : `<h1>${name}</h1>`

    response.setHeader('content-type', 'text/html; charset=UTF-8')
    response.end(`<!doctype html><html><head><link rel="canonical" href="${canonicalLink}"><script type="application/ld+json">${jsonLd}</script></head><body>${breadcrumbs}${body}<footer>Antoine Quarroz · Valais</footer></body></html>`)
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
  return execFileAsync('bash', ['scripts/ops/verify-service-breadcrumbs.sh', origin], { cwd: process.cwd() })
}

describe('AQ-SEO-010 public structured data', () => {
  it('builds an ordered breadcrumb trail whose last URL is the page canonical', () => {
    const trail = resolvePublicBreadcrumbTrail('https://www.antoinequarroz.ch/', [
      { name: 'Accueil', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: 'Un article', path: '/blog/un-article' },
    ])

    expect(trail.items).toEqual([
      { name: 'Accueil', path: '/', url: 'https://www.antoinequarroz.ch/' },
      { name: 'Blog', path: '/blog', url: 'https://www.antoinequarroz.ch/blog' },
      { name: 'Un article', path: '/blog/un-article', url: 'https://www.antoinequarroz.ch/blog/un-article' },
    ])
    expect(trail.jsonLd).toEqual({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.antoinequarroz.ch/' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.antoinequarroz.ch/blog' },
        { '@type': 'ListItem', position: 3, name: 'Un article', item: 'https://www.antoinequarroz.ch/blog/un-article' },
      ],
    })
  })

  it('rejects ambiguous breadcrumb origins, paths and labels', () => {
    expect(() => resolvePublicBreadcrumbTrail('https://user@example.com', [
      { name: 'Accueil', path: '/' },
      { name: 'Service', path: '/service' },
    ])).toThrow('public_site_origin_invalid')
    expect(() => resolvePublicBreadcrumbTrail('https://example.com', [
      { name: 'Accueil', path: '/' },
    ])).toThrow('public_breadcrumb_items_invalid')
    expect(() => resolvePublicBreadcrumbTrail('https://example.com', [
      { name: 'Accueil', path: '/' },
      { name: '', path: '/service' },
    ])).toThrow('public_breadcrumb_name_invalid')

    for (const path of ['https://evil.test/service', '//evil.test/service', '/service?preview=1', '/service#details', '/a/../service', '/service\\evil']) {
      expect(() => resolvePublicBreadcrumbTrail('https://example.com', [
        { name: 'Accueil', path: '/' },
        { name: 'Service', path },
      ])).toThrow('public_structured_path_invalid')
    }
    expect(() => resolvePublicBreadcrumbTrail('https://example.com', [
      { name: 'Accueil', path: '/' },
      { name: 'Encore accueil', path: '/' },
    ])).toThrow('public_breadcrumb_path_duplicate')
  })

  it('builds a deliberately minimal Service from approved public values', () => {
    const service = resolvePublicService('https://www.antoinequarroz.ch', {
      name: 'Création de site internet en Valais',
      serviceType: 'Création de site internet',
      description: 'Je conçois des sites web sur mesure pour entreprises valaisannes.',
      path: '/creation-site-internet-valais',
      areaServed: 'Valais',
    })

    expect(service).toEqual({
      '@type': 'Service',
      '@id': 'https://www.antoinequarroz.ch/creation-site-internet-valais#service',
      name: 'Création de site internet en Valais',
      serviceType: 'Création de site internet',
      description: 'Je conçois des sites web sur mesure pour entreprises valaisannes.',
      url: 'https://www.antoinequarroz.ch/creation-site-internet-valais',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://www.antoinequarroz.ch/creation-site-internet-valais',
      },
      provider: {
        '@type': 'ProfessionalService',
        '@id': 'https://www.antoinequarroz.ch/#business',
        name: 'Antoine Quarroz',
        url: 'https://www.antoinequarroz.ch/',
      },
      areaServed: {
        '@type': 'AdministrativeArea',
        name: 'Valais',
      },
    })
    expect(service).not.toHaveProperty('offers')
    expect(service).not.toHaveProperty('aggregateRating')
    expect(service).not.toHaveProperty('review')
    expect(service).not.toHaveProperty('availability')
  })

  it.each([
    ['name', { name: '' }],
    ['type', { serviceType: ' Création de site internet' }],
    ['description', { description: ' ' }],
    ['area', { areaServed: 'Valais ' }],
  ])('rejects an invalid service %s', (_label, override) => {
    expect(() => resolvePublicService('https://example.com', {
      name: 'Service',
      serviceType: 'Service web',
      description: 'Description publique.',
      path: '/service',
      areaServed: 'Valais',
      ...override,
    })).toThrow(/public_service_/)
  })

  it('wires every scoped public page to the shared visible and structured model', async () => {
    const [component, article, project, ...services] = await Promise.all([
      readFile('app/components/ui/AppBreadcrumbs.vue', 'utf8'),
      readFile('app/pages/blog/[slug].vue', 'utf8'),
      readFile('app/pages/projets/[slug].vue', 'utf8'),
      ...servicePaths.map(path => readFile(`app/pages${path}.vue`, 'utf8')),
    ])

    expect(component).toContain('aria-label="Fil d’Ariane"')
    expect(component).toContain('aria-current="page"')
    expect(component).toContain('focus-visible:ring-2')
    expect(article).toContain('breadcrumbs.value.jsonLd')
    expect(article).toContain("'@type': 'BlogPosting'")
    expect(project).toContain('breadcrumbs.value.jsonLd')
    expect(project).toContain("'@type': 'CreativeWork'")
    for (const page of services) {
      expect(page).toContain('<UiAppBreadcrumbs')
      expect(page).toContain('resolvePublicService')
      expect(page).toContain('data-service-name')
      expect(page).toContain('data-service-description')
    }
  })

  unixIt.each(['valid', 'valid-no-deep-content'] as const)('accepts the %s public graph', async (variant) => {
    const origin = await startProofServer(variant)
    const result = await runProof(origin)
    expect(result.stdout).toContain('Service and breadcrumb data is valid on 4 service page(s)')
  })

  unixIt.each([
    ['a missing Service object', 'missing-service'],
    ['a missing required service page', 'missing-service-page'],
    ['visible and structured service divergence', 'service-divergence'],
    ['a divergent provider', 'provider-divergence'],
    ['a divergent service area', 'area-divergence'],
    ['a forbidden commercial property', 'forbidden-property'],
    ['a missing visible breadcrumb', 'missing-breadcrumb'],
    ['visible and structured breadcrumb divergence', 'breadcrumb-divergence'],
    ['a non-continuous breadcrumb position', 'position-divergence'],
    ['a canonical mismatch', 'canonical-divergence'],
    ['invalid JSON-LD', 'invalid-json'],
    ['a redirecting scoped page', 'redirect'],
  ] as const)('rejects %s', async (_label, variant) => {
    const origin = await startProofServer(variant)
    await expect(runProof(origin)).rejects.toMatchObject({ code: 1 })
  })

  unixIt('rejects an unsafe origin before making a request', async () => {
    await expect(runProof('https://user@example.com')).rejects.toMatchObject({ code: 64 })
  })
})
