export interface Article {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string | null
  published: boolean
  authorKey: string
  tags: string[]
  createdAt: string
  publishedAt: string | null
  updatedAt: string | null
  readTime: number
}

type ArticleRow = {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image: string | null
  published: boolean
  author_key: string
  tags: string[] | null
  created_at: string
  published_at: string | null
  updated_at: string | null
  read_time: number
}

function mapArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    coverImage: row.cover_image,
    published: row.published,
    authorKey: row.author_key,
    tags: row.tags ?? [],
    createdAt: row.created_at?.slice(0, 10) ?? '',
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at ?? null,
    readTime: row.read_time,
  }
}

export const useArticlesStore = defineStore('articles', () => {
  const auth = useAuthStore()
  const articles = ref<Article[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const loadedContext = ref<string | null>(null)
  const loadingContext = ref<string | null>(null)
  let requestVersion = 0

  function requestContext() {
    return auth.accessToken
      ? `authenticated:${auth.userEmail ?? ''}:${auth.currentOrganizationId ?? ''}`
      : 'public'
  }

  async function ensureLoaded(force = false) {
    const context = requestContext()
    if (loading.value && loadingContext.value === context) return
    if (loaded.value && loadedContext.value === context && !force) return

    const version = ++requestVersion
    loading.value = true
    loadingContext.value = context
    try {
      const rows = await $fetch<ArticleRow[]>('/api/articles', { headers: auth.authHeader() })
      if (version !== requestVersion) return
      articles.value = rows.map(mapArticle)
      loaded.value = true
      loadedContext.value = context
    }
    finally {
      if (version === requestVersion) {
        loading.value = false
        loadingContext.value = null
      }
    }
  }

  async function add(article: Omit<Article, 'id' | 'createdAt' | 'publishedAt' | 'updatedAt'>) {
    const row = await $fetch<ArticleRow>('/api/articles', {
      method: 'POST',
      body: article,
      headers: auth.authHeader(),
    })
    const mapped = mapArticle(row)
    articles.value.unshift(mapped)
    return mapped
  }

  async function update(id: number, data: Partial<Article>) {
    const payload = { ...data, id }
    const row = await $fetch<ArticleRow>('/api/articles', {
      method: 'PUT',
      body: payload,
      headers: auth.authHeader(),
    })
    const idx = articles.value.findIndex(a => a.id === id)
    if (idx !== -1) articles.value[idx] = mapArticle(row)
  }

  async function remove(id: number) {
    await $fetch('/api/articles', {
      method: 'DELETE',
      query: { id },
      headers: auth.authHeader(),
    })
    articles.value = articles.value.filter(a => a.id !== id)
  }

  const published = computed(() => articles.value.filter(a => a.published))
  const drafts = computed(() => articles.value.filter(a => !a.published))

  return { articles, loading, loaded, ensureLoaded, add, update, remove, published, drafts }
})
