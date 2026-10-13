import { beforeEach, describe, expect, it, vi } from 'vitest'

const canonicalOrganization = vi.hoisted(() => ({ resolve: vi.fn() }))
vi.mock('../server/utils/publicOrganization', () => ({
  resolveCanonicalPublicOrganizationId: canonicalOrganization.resolve,
}))

const row = (slug: string, overrides: Record<string, unknown> = {}) => ({
  id: 1,
  organization_id: 'canonical-public',
  title: `Article ${slug}`,
  slug,
  excerpt: 'Résumé public',
  content: `Corps complet ${slug}`,
  cover_image: '/article.webp',
  published: true,
  published_at: '2026-10-13T05:00:00Z',
  created_at: '2026-10-12T15:00:00Z',
  tags: ['Développement'],
  read_time: 4,
  internal_note: 'private-note',
  ...overrides,
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

function articleQuery(rows: ReturnType<typeof row>[], error: unknown = null) {
  let columns: string[] = []
  let resultLimit: number | undefined
  const filters: Array<(value: ReturnType<typeof row>) => boolean> = []
  const query: Record<string, any> = {
    select: vi.fn((projection: string) => { columns = projection.split(','); return query }),
    eq: vi.fn((name: string, value: unknown) => { filters.push(article => article[name as keyof typeof article] === value); return query }),
    order: vi.fn(() => query),
    limit: vi.fn((value: number) => { resultLimit = value; return query }),
    maybeSingle: vi.fn(async () => ({ data: data()[0] ?? null, error })),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: data(), error })),
  }
  function data() {
    const matching = rows.filter(article => filters.every(filter => filter(article)))
    return (resultLimit === undefined ? matching : matching.slice(0, resultLimit))
      .map(article => Object.fromEntries(columns.map(column => [column, article[column as keyof typeof article]])))
  }
  return query
}

function stubApi(query: ReturnType<typeof articleQuery>, params: { limit?: unknown, slug?: string } = {}) {
  canonicalOrganization.resolve.mockResolvedValue('canonical-public')
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getSupabaseAdmin', () => ({ from: vi.fn(() => query) }))
  vi.stubGlobal('getQuery', () => params.limit === undefined ? {} : { limit: params.limit })
  vi.stubGlobal('getRouterParam', () => params.slug)
  vi.stubGlobal('createError', (input: { statusCode: number, statusMessage: string }) => Object.assign(new Error(input.statusMessage), input))
}

describe('minimal public homepage article data', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    canonicalOrganization.resolve.mockReset()
  })

  it('limits the canonical published database query to three summaries without fetching bodies', async () => {
    const query = articleQuery([
      row('one'), row('two'), row('three'), row('four'),
      row('draft', { published: false }), row('other-tenant', { organization_id: 'other' }),
    ])
    stubApi(query, { limit: '3' })
    const { default: handler } = await import('../server/api/public/articles.get')
    const result = await handler({ context: {}, headers: { authorization: 'Bearer ignored', 'x-organization-id': 'other' } } as never)

    expect(query.limit).toHaveBeenCalledWith(3)
    expect(query.eq).toHaveBeenCalledWith('organization_id', 'canonical-public')
    expect(query.eq).toHaveBeenCalledWith('published', true)
    expect(query.order).toHaveBeenNthCalledWith(1, 'published_at', { ascending: false, nullsFirst: false })
    expect(query.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: false })
    expect(query.order).toHaveBeenNthCalledWith(3, 'slug', { ascending: true })
    expect(query.select.mock.calls[0][0].split(',')).not.toContain('content')
    expect(result.map((article: { slug: string }) => article.slug)).toEqual(['one', 'two', 'three'])
    expect(JSON.stringify(result)).not.toContain('Corps complet')
    expect(JSON.stringify(result)).not.toContain('private-note')
    expect(result[0]).not.toHaveProperty('organization_id')
  })

  it('keeps the complete public blog listing when no limit is requested', async () => {
    const query = articleQuery([row('one'), row('two'), row('three'), row('four')])
    stubApi(query)
    const { default: handler } = await import('../server/api/public/articles.get')
    expect(await handler({} as never)).toHaveLength(4)
    expect(query.limit).not.toHaveBeenCalled()
  })

  it.each(['0', '-1', '3.5', '51', '100000000000000000', '3junk', '', ['3', '4']])('rejects an invalid or excessive limit %j before querying', async (limit) => {
    const query = articleQuery([])
    stubApi(query, { limit })
    const { default: handler } = await import('../server/api/public/articles.get')
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 400 })
    expect(canonicalOrganization.resolve).not.toHaveBeenCalled()
  })

  it('loads one published canonical body on demand with an explicit four-field DTO', async () => {
    const query = articleQuery([row('one'), row('two'), row('one', { organization_id: 'other' })])
    stubApi(query, { slug: 'one' })
    const { default: handler } = await import('../server/api/public/articles/[slug].get')
    expect(await handler({ context: {}, headers: { 'x-organization-id': 'other' } } as never)).toEqual({
      slug: 'one', title: 'Article one', excerpt: 'Résumé public', content: 'Corps complet one',
    })
    expect(query.select).toHaveBeenCalledWith('slug,title,excerpt,content')
    expect(query.eq).toHaveBeenCalledWith('organization_id', 'canonical-public')
    expect(query.eq).toHaveBeenCalledWith('published', true)
    expect(query.eq).toHaveBeenCalledWith('slug', 'one')
  })

  it.each([
    row('draft', { published: false }),
    row('draft', { organization_id: 'other' }),
  ])('returns a 404 for unpublished or other-tenant articles', async (article) => {
    stubApi(articleQuery([article]), { slug: 'draft' })
    const { default: handler } = await import('../server/api/public/articles/[slug].get')
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 404 })
  })

  it.each(['missing-organization', 'database-error'])('fails closed for %s with a generic public error', async (failure) => {
    const query = articleQuery([row('one')], failure === 'database-error' ? new Error('secret-database-error') : null)
    stubApi(query, { slug: 'one' })
    if (failure === 'missing-organization') canonicalOrganization.resolve.mockResolvedValue(null)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: handler } = await import('../server/api/public/articles/[slug].get')
    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 503, message: 'L’article est temporairement indisponible.',
    })
  })
})

describe('homepage article state stays separate from full articles', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.stubGlobal('ref', <T>(value: T) => ({ value }))
    vi.stubGlobal('computed', <T>(getter: () => T) => ({ get value() { return getter() } }))
    vi.stubGlobal('defineStore', (_name: string, setup: () => unknown) => setup)
    vi.stubGlobal('useAuthStore', () => ({ accessToken: null, authHeader: () => ({}) }))
  })

  it('requests only three summaries, deduplicates loading and still loads full articles separately for a detail', async () => {
    const response = deferred<ReturnType<typeof row>[]>()
    const fetch = vi.fn().mockReturnValueOnce(response.promise).mockResolvedValueOnce([row('one'), row('four')])
    vi.stubGlobal('$fetch', fetch)
    const { useHomepageArticlesStore } = await import('../app/stores/homepageArticles')
    const { useArticlesStore } = await import('../app/stores/articles')
    const homepage = useHomepageArticlesStore() as ReturnType<typeof useHomepageArticlesStore> & { articles: { value: unknown[] }, loaded: { value: boolean } }
    const full = useArticlesStore() as ReturnType<typeof useArticlesStore> & { articles: { value: Array<{ content: string }> }, loaded: { value: boolean } }

    const first = homepage.ensureLoaded()
    expect(homepage.ensureLoaded()).toBe(first)
    response.resolve([row('one')])
    await first
    await homepage.ensureLoaded()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/public/articles', { query: { limit: 3 } })
    expect(homepage.articles.value[0]).toMatchObject({ id: 'one', createdAt: '2026-10-12', publishedAt: '2026-10-13T05:00:00Z' })
    expect(homepage.articles.value[0]).not.toHaveProperty('content')
    expect(full.loaded.value).toBe(false)

    await full.ensureLoaded()
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/articles', { headers: {} })
    expect(full.articles.value).toHaveLength(2)
    expect(full.articles.value[0]?.content).toBe('Corps complet one')
  })

  it('can retry a failed summary load without marking partial state complete', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce([row('one')]))
    const { useHomepageArticlesStore } = await import('../app/stores/homepageArticles')
    const store = useHomepageArticlesStore() as ReturnType<typeof useHomepageArticlesStore> & { loading: { value: boolean }, loaded: { value: boolean } }
    await expect(store.ensureLoaded()).rejects.toThrow('unavailable')
    expect(store.loaded.value).toBe(false)
    expect(store.loading.value).toBe(false)
    await store.ensureLoaded()
    expect(store.loaded.value).toBe(true)
  })

  it('deduplicates the same body request, keeps different cards independent and permits a retry after failure', async () => {
    const first = deferred<{ slug: string, title: string, excerpt: string, content: string }>()
    const second = deferred<{ slug: string, title: string, excerpt: string, content: string }>()
    const fetch = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValueOnce({ slug: 'one', title: 'One', excerpt: '', content: 'Retry' })
    vi.stubGlobal('$fetch', fetch)
    const { useHomepageArticlesStore } = await import('../app/stores/homepageArticles')
    const store = useHomepageArticlesStore()
    const one = store.fetchArticlePreview('one')
    expect(store.fetchArticlePreview('one')).toBe(one)
    const two = store.fetchArticlePreview('two / space')
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/public/articles/two%20%2F%20space')
    second.resolve({ slug: 'two / space', title: 'Two', excerpt: '', content: 'Second' })
    await expect(two).resolves.toMatchObject({ content: 'Second' })
    first.reject(new Error('temporary'))
    await expect(one).rejects.toThrow('temporary')
    await expect(store.fetchArticlePreview('one')).resolves.toMatchObject({ content: 'Retry' })
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})
