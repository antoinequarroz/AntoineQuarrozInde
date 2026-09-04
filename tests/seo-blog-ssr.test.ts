import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PUBLIC_ARTICLE_SUMMARY_COLUMNS,
  serializePublicArticleSummary,
} from '../server/utils/publicContent'

const execFileAsync = promisify(execFile)
const openServers: Array<ReturnType<typeof createServer>> = []
const publicOrganization = vi.hoisted(() => ({
  resolve: vi.fn(),
}))

vi.mock('../server/utils/publicOrganization', () => ({
  resolveCanonicalPublicOrganizationId: publicOrganization.resolve,
}))

type Row = Record<string, any>

function eventError(input: { statusCode: number, statusMessage: string }) {
  return Object.assign(new Error(input.statusMessage), input)
}

function createArticleQuery(rows: Row[], error: unknown = null) {
  let projection = '*'
  const filters: Array<(row: Row) => boolean> = []
  const query: Record<string, any> = {
    select: vi.fn((columns: string) => {
      projection = columns
      return query
    }),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push(row => row[column] === value)
      return query
    }),
    order: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) => {
      const columns = projection.split(',')
      const data = rows
        .filter(row => filters.every(filter => filter(row)))
        .map(row => Object.fromEntries(columns.map(column => [column, row[column]])))
      return Promise.resolve(resolve({ data, error }))
    },
  }
  return query
}

async function callPublicArticles(rows: Row[], options: { organizationId?: string | null, error?: unknown } = {}) {
  const query = createArticleQuery(rows, options.error)
  publicOrganization.resolve.mockResolvedValue(options.organizationId === undefined ? 'org-public' : options.organizationId)
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getSupabaseAdmin', () => ({ from: vi.fn(() => query) }))
  vi.stubGlobal('createError', eventError)
  vi.stubGlobal('PUBLIC_ARTICLE_SUMMARY_COLUMNS', PUBLIC_ARTICLE_SUMMARY_COLUMNS)
  vi.stubGlobal('serializePublicArticleSummary', serializePublicArticleSummary)

  const { default: handler } = await import('../server/api/public/articles.get')
  const result = await handler({
    context: {},
    headers: {
      authorization: 'Bearer must-not-affect-public-html',
      'x-organization-id': 'org-other',
    },
  } as never)
  return { query, result: result as Row[] }
}

const articleRows = [
  {
    organization_id: 'org-public',
    title: 'Publié </script><strong>sans HTML</strong>',
    slug: 'publie',
    excerpt: 'Visible & sûr',
    cover_image: '/article.webp',
    published: true,
    published_at: '2026-09-03T10:00:00.000Z',
    tags: ['SEO'],
    created_at: '2026-09-01T10:00:00.000Z',
    read_time: 4,
    content: 'Corps à ne pas sérialiser',
    internal_note: 'secret',
  },
  {
    organization_id: 'org-public',
    title: 'Brouillon secret',
    slug: 'brouillon-secret',
    excerpt: 'Privé',
    cover_image: null,
    published: false,
    published_at: null,
    tags: [],
    created_at: '2026-09-02T10:00:00.000Z',
    read_time: 3,
  },
  {
    organization_id: 'org-other',
    title: 'Autre tenant',
    slug: 'autre-tenant',
    excerpt: 'Interdit',
    cover_image: null,
    published: true,
    published_at: '2026-09-04T10:00:00.000Z',
    tags: [],
    created_at: '2026-09-04T10:00:00.000Z',
    read_time: 2,
  },
]

type ProofVariant =
  | 'valid'
  | 'empty'
  | 'escaped-hostile'
  | 'missing-link'
  | 'leaky-dto'
  | 'payload-leak'
  | 'extra-card'
  | 'unsafe-html'
  | 'false-empty'

function serializeNuxtPayload(articles: Row[], leakPayload: boolean) {
  const table: unknown[] = []
  function add(value: unknown): number {
    const index = table.length
    table.push(null)
    if (Array.isArray(value)) table[index] = value.map(add)
    else if (value && typeof value === 'object') {
      table[index] = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, add(child)]))
    }
    else table[index] = value
    return index
  }
  add({
    data: {
      'public-blog-articles': articles,
    },
    ...(leakPayload ? {
      pinia: {
        auth: {
          accessToken: 'payload-secret',
          userEmail: 'admin@example.test',
          currentOrganizationId: 'org-secret',
        },
      },
    } : {}),
  })
  return JSON.stringify(table).replaceAll('<', '\\u003C').replaceAll('>', '\\u003E')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

async function startProofServer(variant: ProofVariant) {
  const hostile = variant === 'escaped-hostile' || variant === 'unsafe-html'
  const article = {
    title: hostile ? 'Article <public>' : 'Article public',
    slug: 'article-public',
    excerpt: hostile ? 'Résumé <script>alert(1)</script> & public' : 'Résumé public',
    cover_image: null,
    published_at: '2026-09-03T10:00:00.000Z',
    tags: ['SEO'],
    created_at: '2026-09-01T10:00:00.000Z',
    read_time: 4,
    ...(variant === 'leaky-dto' ? { content: 'secret' } : {}),
  }
  const articles = variant === 'empty' ? [] : [article]
  const payload = serializeNuxtPayload(articles, variant === 'payload-leak')
  const payloadScript = `<script type="application/json" id="__NUXT_DATA__">${payload}</script>`
  const articleTitle = variant === 'unsafe-html' ? article.title : escapeHtml(article.title)
  const articleExcerpt = variant === 'unsafe-html' ? article.excerpt : escapeHtml(article.excerpt)
  const extraCard = variant === 'extra-card'
    ? '<article><h2>Brouillon secret</h2><a href="/blog/brouillon-secret">Lire</a></article>'
    : ''
  const pageBody = variant === 'empty'
    ? '<!doctype html><p>Premiers articles bientôt disponibles...</p>'
    : variant === 'false-empty'
    ? '<!doctype html><p>Premiers articles bientôt disponibles...</p>'
    : `<!doctype html><article><h2>${articleTitle}</h2><p>${articleExcerpt}</p><time datetime="${article.published_at}">3 septembre 2026</time>${variant === 'missing-link' ? '' : '<a href="/blog/article-public">Lire</a>'}</article>${extraCard}`
  const blog = `${pageBody}${payloadScript}`

  const server = createServer((request, response) => {
    response.setHeader('content-type', request.url === '/api/public/articles' ? 'application/json' : 'text/html; charset=UTF-8')
    if (request.url === '/api/public/articles') response.end(JSON.stringify(articles))
    else if (request.url === '/blog') response.end(blog)
    else {
      response.statusCode = 404
      response.end()
    }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  openServers.push(server)
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`
}

describe('AQ-SEO-007 public blog SSR', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    publicOrganization.resolve.mockReset()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await Promise.all(openServers.splice(0).map(server => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
    })))
  })

  it('returns only canonical published summaries even when identity headers are injected', async () => {
    const { query, result } = await callPublicArticles(articleRows)

    expect(publicOrganization.resolve).toHaveBeenCalledWith()
    expect(query.select).toHaveBeenCalledWith(PUBLIC_ARTICLE_SUMMARY_COLUMNS)
    expect(query.eq).toHaveBeenCalledWith('organization_id', 'org-public')
    expect(query.eq).toHaveBeenCalledWith('published', true)
    expect(query.order).toHaveBeenNthCalledWith(1, 'published_at', { ascending: false, nullsFirst: false })
    expect(query.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: false })
    expect(query.order).toHaveBeenNthCalledWith(3, 'slug', { ascending: true })
    expect(result).toEqual([serializePublicArticleSummary(articleRows[0]!)])
    expect(result[0]).not.toHaveProperty('content')
    expect(result[0]).not.toHaveProperty('published')
    expect(result[0]).not.toHaveProperty('organization_id')
    expect(result[0]).not.toHaveProperty('internal_note')
  })

  it('fails closed with a generic 503 when the canonical organization is absent', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(callPublicArticles(articleRows, { organizationId: null })).rejects.toMatchObject({
      statusCode: 503,
      message: 'Les articles sont temporairement indisponibles.',
    })
  })

  it('does not expose a database error through the public response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(callPublicArticles(articleRows, { error: new Error('database-password-secret') })).rejects.toMatchObject({
      statusCode: 503,
      message: 'Les articles sont temporairement indisponibles.',
    })
  })

  it('loads the public endpoint during setup and renders four distinct states', async () => {
    const page = await readFile('app/pages/blog/index.vue', 'utf8')

    expect(page).toContain("await useAsyncData<PublicArticleSummary[]>(")
    expect(page).toContain("() => $fetch('/api/public/articles')")
    expect(page).not.toContain('useArticlesStore')
    expect(page).not.toContain('onMounted')
    expect(page.indexOf('v-if="articleError"')).toBeLessThan(page.indexOf("v-else-if=\"articleStatus === 'pending'\""))
    expect(page.indexOf("v-else-if=\"articleStatus === 'pending'\"")).toBeLessThan(page.indexOf('v-else-if="articles.length"'))
    expect(page).toContain('role="alert"')
    expect(page).toContain('@click="refreshArticles()"')
    expect(page).toContain('<time :datetime="publicationDate(article)">')
    expect(page).toContain(':to="articlePath(article.slug)"')
    expect(page).toContain('`/blog/${encodeURIComponent(slug)}`')
    expect(page).not.toContain('{{ articleError')
  })

  it('accepts a complete server-rendered listing proof', async () => {
    const origin = await startProofServer('valid')
    await expect(execFileAsync('bash', ['scripts/ops/verify-blog-ssr.sh', origin])).resolves.toMatchObject({
      stdout: expect.stringContaining('1 published article(s)'),
    })
  })

  it('accepts a clear server-rendered empty state', async () => {
    const origin = await startProofServer('empty')
    await expect(execFileAsync('bash', ['scripts/ops/verify-blog-ssr.sh', origin])).resolves.toMatchObject({
      stdout: expect.stringContaining('0 published article(s)'),
    })
  })

  it('accepts hostile title and excerpt characters only when rendered as escaped text', async () => {
    const origin = await startProofServer('escaped-hostile')
    await expect(execFileAsync('bash', ['scripts/ops/verify-blog-ssr.sh', origin])).resolves.toMatchObject({
      stdout: expect.stringContaining('1 published article(s)'),
    })
  })

  it.each([
    ['a missing crawlable link', 'missing-link'],
    ['an excessive public DTO', 'leaky-dto'],
    ['a secret in the Nuxt payload', 'payload-leak'],
    ['an extra draft card in visible HTML', 'extra-card'],
    ['unescaped hostile article text', 'unsafe-html'],
    ['a false empty state', 'false-empty'],
  ] as const)('rejects %s', async (_label, variant) => {
    const origin = await startProofServer(variant)
    await expect(execFileAsync('bash', ['scripts/ops/verify-blog-ssr.sh', origin])).rejects.toBeTruthy()
  })
})
