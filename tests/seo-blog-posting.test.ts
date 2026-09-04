import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

import {
  ARTICLE_LANGUAGE,
  ARTICLE_TIME_ZONE,
  formatArticleEditorialDate,
  resolveArticleEditorialMeta,
} from '../shared/utils/articleSeo'
import { PUBLIC_SEO_IDENTITY } from '../shared/utils/publicSeoIdentity'

const execFileAsync = promisify(execFile)
const proofServers: Array<ReturnType<typeof createServer>> = []
const unixIt = process.platform === 'win32' ? it.skip : it

type ProofVariant = 'valid-unmodified' | 'valid-modified' | 'unapproved-author' | 'invented-modification' | 'structured-divergence'

afterEach(async () => {
  await Promise.all(proofServers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })))
})

async function startProofServer(variant: ProofVariant) {
  const publishedAt = '2026-09-04T08:00:00.000Z'
  const updatedAt = variant === 'valid-modified' ? '2026-09-04T10:00:00.000Z' : publishedAt
  const exposesModification = variant === 'valid-modified' || variant === 'invented-modification'
  const pageModifiedAt = exposesModification ? '2026-09-04T10:00:00.000Z' : null
  const article = {
    id: 9,
    title: 'Article attribué',
    slug: 'article-attribue',
    excerpt: 'Une description publique.',
    content: 'Contenu',
    cover_image: null,
    published: true,
    author_key: variant === 'unapproved-author' ? 'unknown' : 'antoine-quarroz',
    published_at: publishedAt,
    updated_at: updatedAt,
    tags: ['SEO'],
    created_at: publishedAt,
    read_time: 4,
  }

  const server = createServer((request, response) => {
    const address = server.address() as { port: number }
    const origin = `http://127.0.0.1:${address.port}`
    const canonical = `${origin}/blog/article-attribue`
    const posting = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: variant === 'structured-divergence' ? 'Autre titre' : article.title,
      description: article.excerpt,
      image: `${origin}/about.jpg`,
      inLanguage: 'fr-CH',
      url: canonical,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      author: {
        '@type': 'Person',
        '@id': `${origin}/#person`,
        name: 'Antoine Quarroz',
        url: `${origin}/`,
      },
      datePublished: publishedAt,
      ...(pageModifiedAt ? { dateModified: pageModifiedAt } : {}),
    }
    const modified = pageModifiedAt
      ? `<span>Mis à jour le <time data-article-modified datetime="${pageModifiedAt}">04 septembre 2026</time></span>`
      : ''
    const html = `<!doctype html><html><head><link rel="canonical" href="${canonical}"><meta property="og:image" content="${origin}/about.jpg"><script type="application/ld+json">${JSON.stringify(posting)}</script></head><body><article><h1>${article.title}</h1><p>${article.excerpt}</p><a data-article-author href="/#about">Antoine Quarroz</a><time data-article-published datetime="${publishedAt}">04 septembre 2026</time>${modified}</article></body></html>`

    if (request.url === '/api/articles') {
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify([article]))
      return
    }
    if (request.url === '/blog/article-attribue') {
      response.setHeader('content-type', 'text/html; charset=UTF-8')
      response.end(html)
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
  return execFileAsync('bash', ['scripts/ops/verify-blog-posting.sh', origin], { cwd: process.cwd() })
}

describe('AQ-SEO-009 article attribution and freshness', () => {
  it('resolves only the approved author and a real later modification', () => {
    expect(PUBLIC_SEO_IDENTITY.key).toBe('antoine-quarroz')
    expect(ARTICLE_LANGUAGE).toBe('fr-CH')
    expect(ARTICLE_TIME_ZONE).toBe('Europe/Zurich')

    expect(resolveArticleEditorialMeta({
      authorKey: 'antoine-quarroz',
      publishedAt: '2026-09-04T08:00:00.000Z',
      updatedAt: '2026-09-04T08:00:00.000Z',
    })).toEqual({
      authorKey: 'antoine-quarroz',
      authorName: 'Antoine Quarroz',
      datePublished: '2026-09-04T08:00:00.000Z',
      dateModified: null,
    })

    expect(resolveArticleEditorialMeta({
      authorKey: 'antoine-quarroz',
      publishedAt: '2026-09-04T08:00:00.000Z',
      updatedAt: '2026-09-04T10:00:00.000Z',
    }).dateModified).toBe('2026-09-04T10:00:00.000Z')
    expect(formatArticleEditorialDate('2026-09-04T08:00:00.000Z')).toContain('2026')
  })

  it('fails closed on missing source data without inventing dates', () => {
    expect(() => resolveArticleEditorialMeta({
      authorKey: 'unknown',
      publishedAt: '2026-09-04T08:00:00.000Z',
      updatedAt: null,
    })).toThrow('article_author_invalid')
    expect(() => resolveArticleEditorialMeta({
      authorKey: 'antoine-quarroz',
      publishedAt: '',
      updatedAt: null,
    })).toThrow('article_publication_date_invalid')
    expect(() => resolveArticleEditorialMeta({
      authorKey: 'antoine-quarroz',
      publishedAt: '2026-09-04T08:00:00.000Z',
      updatedAt: 'not-a-date',
    })).toThrow('article_modification_date_invalid')
  })

  it('wires the CRM, public DTO and article page to the canonical attribution', async () => {
    const [form, store, publicContent, page, migration] = await Promise.all([
      readFile('app/pages/admin/articles/index.vue', 'utf8'),
      readFile('app/stores/articles.ts', 'utf8'),
      readFile('server/utils/publicContent.ts', 'utf8'),
      readFile('app/pages/blog/[slug].vue', 'utf8'),
      readFile('supabase/migrations/20260904163123_add_article_author_attribution.sql', 'utf8'),
    ])

    expect(form).toContain('form.authorKey')
    expect(form).toContain('PUBLIC_SEO_IDENTITY.name')
    expect(store).toContain('publishedAt: row.published_at')
    expect(store).toContain('updatedAt: row.updated_at')
    expect(publicContent).toContain("'author_key'")
    expect(page).toContain("'@type': 'BlogPosting'")
    expect(page).toContain('data-article-author')
    expect(page).toContain('data-article-published')
    expect(page).toContain('data-article-modified')
    expect(migration).toContain("add column if not exists author_key text")
    expect(migration).toContain('security invoker')
    expect(migration).not.toMatch(/drop\s+(table|column)/i)
  })

  unixIt.each(['valid-unmodified', 'valid-modified'] as const)('accepts a %s article', async (variant) => {
    const origin = await startProofServer(variant)
    const result = await runProof(origin)
    expect(result.stdout).toContain('BlogPosting attribution is valid on 1 published article')
  })

  unixIt.each([
    ['an unapproved source author', 'unapproved-author'],
    ['an invented modification date', 'invented-modification'],
    ['structured data divergence', 'structured-divergence'],
  ] as const)('rejects %s', async (_label, variant) => {
    const origin = await startProofServer(variant)
    await expect(runProof(origin)).rejects.toMatchObject({ code: 1 })
  })

  unixIt('rejects an unsafe origin before making a request', async () => {
    await expect(runProof('https://user@example.com')).rejects.toMatchObject({ code: 64 })
  })
})
