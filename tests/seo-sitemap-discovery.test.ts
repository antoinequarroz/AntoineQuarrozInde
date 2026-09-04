import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { promisify } from 'node:util'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildSitemapEntries,
  renderSitemapXml,
  sitemapStaticPaths,
} from '../server/utils/sitemapDiscovery'

const execFileAsync = promisify(execFile)
const openServers: Array<ReturnType<typeof createServer>> = []

type ProofVariant = 'valid' | 'missing-article' | 'draft' | 'wrong-date' | 'missing-link' | 'private-field' | 'sitemap-503'

async function startProofServer(variant: ProofVariant) {
  const article = {
    slug: 'article-public',
    published: variant !== 'draft',
    created_at: '2026-01-01T00:00:00.000Z',
    published_at: '2026-01-02T00:00:00.000Z',
    updated_at: '2026-01-03T00:00:00.000Z',
    ...(variant === 'private-field' ? { organization_id: 'org-secret' } : {}),
  }
  const project = {
    slug: 'etude-publique',
    portfolio_visible: false,
    case_study_published: true,
    created_at: '2026-02-01T00:00:00.000Z',
    case_study_published_at: '2026-02-02T00:00:00.000Z',
    updated_at: '2026-02-03T00:00:00.000Z',
  }
  const articleEntry = variant === 'missing-article'
    ? ''
    : `<url><loc>ORIGIN/blog/article-public</loc><lastmod>${variant === 'wrong-date' ? '2025-01-01T00:00:00.000Z' : article.updated_at}</lastmod></url>`
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>ORIGIN/</loc></url>
<url><loc>ORIGIN/blog</loc></url>
<url><loc>ORIGIN/cas-clients-valais</loc></url>
${articleEntry}
<url><loc>ORIGIN/projets/etude-publique</loc><lastmod>${project.updated_at}</lastmod></url>
</urlset>`

  const server = createServer((request, response) => {
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    if (request.url === '/sitemap.xml') {
      response.statusCode = variant === 'sitemap-503' ? 503 : 200
      response.setHeader('content-type', 'application/xml; charset=UTF-8')
      response.end(sitemap.replaceAll('ORIGIN', origin))
      return
    }
    if (request.url === '/api/articles') {
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify([article]))
      return
    }
    if (request.url === '/api/projects') {
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify([project]))
      return
    }
    if (request.url === '/cas-clients-valais') {
      response.setHeader('content-type', 'text/html; charset=UTF-8')
      response.end(variant === 'missing-link'
        ? '<!doctype html><p>Aucune étude</p>'
        : '<!doctype html><a href="/projets/etude-publique">Étude publique</a>')
      return
    }
    response.statusCode = 404
    response.end()
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  openServers.push(server)
  const address = server.address() as { port: number }
  return `http://127.0.0.1:${address.port}`
}

function queryResult(data: unknown[] | null, error: unknown = null) {
  const query: any = {
    eq: vi.fn(() => query),
    then: (resolve: (value: unknown) => void) => resolve({ data, error }),
  }
  return query
}

function eventError(input: { statusCode: number, statusMessage: string }) {
  return Object.assign(new Error(input.statusMessage), input)
}

describe('AQ-SEO-006 sitemap discovery', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  afterEach(async () => {
    await Promise.all(openServers.splice(0).map(server => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
    })))
  })

  it('contains every approved static page including the case-study hub', () => {
    expect(sitemapStaticPaths).toContain('/cas-clients-valais')
    expect(sitemapStaticPaths).toContain('/blog')
    expect(sitemapStaticPaths.some(path => path.startsWith('/admin'))).toBe(false)
    expect(sitemapStaticPaths.some(path => /^\/(?:en|de)\/(?:blog|projets|cas-clients-valais)/.test(path))).toBe(false)
  })

  it('builds stable, encoded and deterministically ordered dynamic entries', () => {
    const entries = buildSitemapEntries(
      [{
        slug: 'zéro & un',
        published_at: '2026-05-01T10:00:00+02:00',
        updated_at: '2026-06-03T08:30:00.000Z',
        created_at: '2026-04-01T00:00:00.000Z',
      }],
      [{
        slug: 'alpha projet',
        case_study_published_at: '2026-05-02T00:00:00.000Z',
        updated_at: null,
        created_at: '2026-03-01T00:00:00.000Z',
      }],
    )
    const dynamic = entries.filter(entry => entry.path.startsWith('/blog/') || entry.path.startsWith('/projets/'))

    expect(dynamic).toEqual([
      {
        path: '/blog/z%C3%A9ro%20%26%20un',
        lastmod: '2026-06-03T08:30:00.000Z',
        changefreq: 'monthly',
        priority: '0.8',
      },
      {
        path: '/projets/alpha%20projet',
        lastmod: '2026-05-02T00:00:00.000Z',
        changefreq: 'monthly',
        priority: '0.9',
      },
    ])
  })

  it('renders escaped XML with one location per entry', () => {
    const xml = renderSitemapXml('https://example.test', [{
      path: '/blog/a%26b',
      lastmod: '2026-06-03T08:30:00.000Z',
      changefreq: 'monthly',
      priority: '0.8',
    }])

    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('<loc>https://example.test/blog/a%26b</loc>')
    expect(xml.match(/<url>/g)).toHaveLength(1)
  })

  it.each([
    ['an empty slug', [{ slug: ' ', created_at: '2026-01-01T00:00:00.000Z' }]],
    ['a missing date', [{ slug: 'article', created_at: '' }]],
    ['an invalid date', [{ slug: 'article', created_at: 'not-a-date' }]],
  ])('rejects %s instead of inventing a sitemap value', (_label, articles) => {
    expect(() => buildSitemapEntries(articles, [])).toThrow(/sitemap_/)
  })

  it('rejects duplicate dynamic locations', () => {
    const row = { slug: 'same', created_at: '2026-01-01T00:00:00.000Z' }
    expect(() => buildSitemapEntries([row, row], [])).toThrow('sitemap_path_duplicate')
  })

  it('loads both public sources inside the canonical organization', async () => {
    const articleQuery = queryResult([{
      slug: 'article',
      published_at: '2026-01-02T00:00:00.000Z',
      updated_at: '2026-01-03T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    }])
    const projectQuery = queryResult([{
      slug: 'etude',
      case_study_published_at: '2026-02-02T00:00:00.000Z',
      updated_at: '2026-02-03T00:00:00.000Z',
      created_at: '2026-02-01T00:00:00.000Z',
    }])
    const select = {
      articles: vi.fn(() => articleQuery),
      projects: vi.fn(() => projectQuery),
    }
    const setHeader = vi.fn()

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://example.test' } }))
    vi.stubGlobal('resolveOrganizationContext', vi.fn().mockResolvedValue({ id: 'org-public', role: null }))
    vi.stubGlobal('getSupabaseAdmin', () => ({
      from: (table: 'articles' | 'projects') => ({ select: select[table] }),
    }))
    vi.stubGlobal('setHeader', setHeader)
    vi.stubGlobal('createError', eventError)

    const { default: handler } = await import('../server/routes/sitemap.xml')
    const event = {} as never
    const xml = await handler(event)

    expect(select.articles).toHaveBeenCalledWith('slug, published_at, updated_at, created_at')
    expect(articleQuery.eq).toHaveBeenNthCalledWith(1, 'organization_id', 'org-public')
    expect(articleQuery.eq).toHaveBeenNthCalledWith(2, 'published', true)
    expect(select.projects).toHaveBeenCalledWith('slug, case_study_published_at, updated_at, created_at')
    expect(projectQuery.eq).toHaveBeenNthCalledWith(1, 'organization_id', 'org-public')
    expect(projectQuery.eq).toHaveBeenNthCalledWith(2, 'case_study_published', true)
    expect(xml).toContain('<loc>https://example.test/blog/article</loc>')
    expect(xml).toContain('<loc>https://example.test/projets/etude</loc>')
    expect(setHeader).toHaveBeenCalledWith(event, 'content-type', 'application/xml; charset=UTF-8')
  })

  it.each(['articles', 'projects'] as const)('returns 503 when the %s source fails', async (failedTable) => {
    const queries = {
      articles: queryResult([], failedTable === 'articles' ? new Error('secret article error') : null),
      projects: queryResult([], failedTable === 'projects' ? new Error('secret project error') : null),
    }
    const setHeader = vi.fn()

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://example.test' } }))
    vi.stubGlobal('resolveOrganizationContext', vi.fn().mockResolvedValue({ id: 'org-public', role: null }))
    vi.stubGlobal('getSupabaseAdmin', () => ({
      from: (table: 'articles' | 'projects') => ({ select: () => queries[table] }),
    }))
    vi.stubGlobal('setHeader', setHeader)
    vi.stubGlobal('createError', eventError)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { default: handler } = await import('../server/routes/sitemap.xml')

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Sitemap temporarily unavailable',
    })
    expect(setHeader).not.toHaveBeenCalled()
  })

  it('returns 503 when the canonical public organization cannot be resolved', async () => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://example.test' } }))
    vi.stubGlobal('resolveOrganizationContext', vi.fn().mockResolvedValue(null))
    vi.stubGlobal('getSupabaseAdmin', vi.fn())
    vi.stubGlobal('setHeader', vi.fn())
    vi.stubGlobal('createError', eventError)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { default: handler } = await import('../server/routes/sitemap.xml')
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 503 })
  })

  it('passes the anonymous HTTP discovery proof for complete public content', async () => {
    const origin = await startProofServer('valid')
    const result = await execFileAsync('bash', ['scripts/ops/verify-sitemap-discovery.sh', origin])

    expect(result.stdout).toContain('1 article(s), 1 case study/studies')
  })

  it.each([
    ['a missing published article', 'missing-article'],
    ['an exposed draft', 'draft'],
    ['a wrong lastmod', 'wrong-date'],
    ['a case study without an SSR link', 'missing-link'],
    ['a private API field', 'private-field'],
    ['an unavailable sitemap', 'sitemap-503'],
  ] as const)('fails the anonymous HTTP proof on %s', async (_label, variant) => {
    const origin = await startProofServer(variant)

    await expect(execFileAsync('bash', ['scripts/ops/verify-sitemap-discovery.sh', origin]))
      .rejects.toMatchObject({ code: 1 })
  })
})
