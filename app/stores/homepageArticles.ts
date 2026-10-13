export interface HomepageArticleSummary {
  id: string
  title: string
  slug: string
  excerpt: string
  coverImage: string | null
  tags: string[]
  createdAt: string
  publishedAt: string | null
  readTime: number
}

interface PublicArticleSummaryRow {
  title: string
  slug: string
  excerpt: string
  cover_image: string | null
  tags: string[]
  created_at: string
  published_at: string | null
  read_time: number
}

export interface PublicArticlePreview {
  slug: string
  title: string
  excerpt: string
  content: string
}

function mapSummary(row: PublicArticleSummaryRow): HomepageArticleSummary {
  return {
    id: row.slug,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    tags: row.tags ?? [],
    createdAt: row.created_at?.slice(0, 10) ?? '',
    publishedAt: row.published_at ?? null,
    readTime: row.read_time,
  }
}

export const useHomepageArticlesStore = defineStore('homepageArticles', () => {
  const articles = ref<HomepageArticleSummary[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  let activeLoad: Promise<void> | null = null
  const previewLoads = new Map<string, Promise<PublicArticlePreview>>()

  function ensureLoaded(force = false) {
    if (activeLoad) return activeLoad
    if (loaded.value && !force) return Promise.resolve()

    loading.value = true
    const load = (async () => {
      const rows = await $fetch<PublicArticleSummaryRow[]>('/api/public/articles', {
        query: { limit: 3 },
      })
      articles.value = rows.map(mapSummary)
      loaded.value = true
    })().finally(() => {
      loading.value = false
      if (activeLoad === load) activeLoad = null
    })
    activeLoad = load
    return load
  }

  function fetchArticlePreview(slug: string): Promise<PublicArticlePreview> {
    const existingLoad = previewLoads.get(slug)
    if (existingLoad) return existingLoad

    const load = $fetch<PublicArticlePreview>(`/api/public/articles/${encodeURIComponent(slug)}`)
      .finally(() => {
        if (previewLoads.get(slug) === load) previewLoads.delete(slug)
      })
    previewLoads.set(slug, load)
    return load
  }

  return { articles, loading, loaded, ensureLoaded, fetchArticlePreview }
})
