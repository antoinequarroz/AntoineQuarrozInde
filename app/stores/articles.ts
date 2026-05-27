export interface Article {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string | null
  published: boolean
  tags: string[]
  createdAt: string
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
  tags: string[] | null
  created_at: string
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
    tags: row.tags ?? [],
    createdAt: row.created_at?.slice(0, 10) ?? '',
    readTime: row.read_time,
  }
}

export const useArticlesStore = defineStore('articles', () => {
  const auth = useAuthStore()
  const articles = ref<Article[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function ensureLoaded(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const rows = await $fetch<ArticleRow[]>('/api/articles')
      articles.value = rows.map(mapArticle)
      loaded.value = true
    }
    finally {
      loading.value = false
    }
  }

  async function add(article: Omit<Article, 'id' | 'createdAt'>) {
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
