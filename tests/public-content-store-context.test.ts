import { beforeEach, describe, expect, it, vi } from 'vitest'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function articleRow(id: number, published: boolean) {
  return {
    id,
    title: `Article ${id}`,
    slug: `article-${id}`,
    excerpt: 'Résumé',
    content: 'Contenu',
    cover_image: null,
    published,
    tags: [],
    created_at: '2026-09-04T09:00:00Z',
    read_time: 5,
  }
}

function projectRow(id: number, portfolioVisible: boolean) {
  return {
    id,
    title: `Projet ${id}`,
    slug: `projet-${id}`,
    category: 'web',
    tags: [],
    description: 'Description',
    image: null,
    live_url: null,
    code_url: null,
    featured: false,
    portfolio_visible: portfolioVisible,
    case_study_published: false,
    created_at: '2026-09-04T09:00:00Z',
  }
}

describe('public content store request context', () => {
  const auth = {
    accessToken: null as string | null,
    userEmail: null as string | null,
    currentOrganizationId: null as string | null,
    authHeader: vi.fn((): Record<string, string> => auth.accessToken
      ? {
          authorization: `Bearer ${auth.accessToken}`,
          ...(auth.currentOrganizationId ? { 'x-organization-id': auth.currentOrganizationId } : {}),
        }
      : {}),
  }

  beforeEach(() => {
    vi.resetModules()
    auth.accessToken = null
    auth.userEmail = null
    auth.currentOrganizationId = null
    auth.authHeader.mockClear()
    vi.stubGlobal('ref', <T>(value: T) => ({ value }))
    vi.stubGlobal('computed', <T>(getter: () => T) => ({ get value() { return getter() } }))
    vi.stubGlobal('defineStore', (_name: string, setup: () => unknown) => setup)
    vi.stubGlobal('useAuthStore', () => auth)
  })

  it('reloads articles when a public session becomes authenticated', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce([articleRow(1, true)])
      .mockResolvedValueOnce([articleRow(1, true), articleRow(2, false)])
      .mockResolvedValueOnce([articleRow(1, true)])
    vi.stubGlobal('$fetch', fetch)

    const { useArticlesStore } = await import('../app/stores/articles')
    const store = useArticlesStore() as ReturnType<typeof useArticlesStore> & {
      articles: { value: Array<{ id: number }> }
    }

    await store.ensureLoaded()
    auth.accessToken = 'admin-token'
    auth.userEmail = 'owner@example.test'
    auth.currentOrganizationId = 'org-a'
    await store.ensureLoaded()
    await store.ensureLoaded()

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[0]?.[1]).toEqual({ headers: {} })
    expect(fetch.mock.calls[1]?.[1]).toEqual({
      headers: { authorization: 'Bearer admin-token', 'x-organization-id': 'org-a' },
    })
    expect(store.articles.value.map(article => article.id)).toEqual([1, 2])

    auth.accessToken = 'client-token'
    auth.userEmail = 'client@example.test'
    await store.ensureLoaded()

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(store.articles.value.map(article => article.id)).toEqual([1])
  })

  it('reloads projects for another organization and discards an obsolete public response', async () => {
    const publicResponse = deferred<ReturnType<typeof projectRow>[]>()
    const fetch = vi.fn()
      .mockReturnValueOnce(publicResponse.promise)
      .mockResolvedValueOnce([projectRow(10, true), projectRow(11, false)])
      .mockResolvedValueOnce([projectRow(20, false)])
    vi.stubGlobal('$fetch', fetch)

    const { useProjectsStore } = await import('../app/stores/projects')
    const store = useProjectsStore() as ReturnType<typeof useProjectsStore> & {
      projects: { value: Array<{ id: number }> }
    }

    const publicLoad = store.ensureLoaded()
    auth.accessToken = 'admin-token'
    auth.userEmail = 'owner@example.test'
    auth.currentOrganizationId = 'org-a'
    await store.ensureLoaded()
    publicResponse.resolve([projectRow(1, true)])
    await publicLoad

    expect(store.projects.value.map(project => project.id)).toEqual([10, 11])

    auth.currentOrganizationId = 'org-b'
    await store.ensureLoaded()

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(store.projects.value.map(project => project.id)).toEqual([20])
  })
})
