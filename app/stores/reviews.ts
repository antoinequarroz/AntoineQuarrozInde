export interface Review {
  id: number
  author: string
  company: string
  role: string
  avatar: string | null
  rating: number
  content: string
  visible: boolean
  createdAt: string
}

type ReviewRow = {
  id: number
  author: string
  company: string
  role: string
  avatar: string | null
  rating: number
  content: string
  visible: boolean
  created_at: string
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    author: row.author,
    company: row.company,
    role: row.role,
    avatar: row.avatar,
    rating: row.rating,
    content: row.content,
    visible: row.visible,
    createdAt: row.created_at?.slice(0, 10) ?? '',
  }
}

export const useReviewsStore = defineStore('reviews', () => {
  const auth = useAuthStore()
  const reviews = ref<Review[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function ensureLoaded(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const rows = await $fetch<ReviewRow[]>('/api/reviews')
      reviews.value = rows.map(mapReview)
      loaded.value = true
    }
    finally {
      loading.value = false
    }
  }

  async function add(review: Omit<Review, 'id' | 'createdAt'>) {
    const row = await $fetch<ReviewRow>('/api/reviews', {
      method: 'POST',
      body: review,
      headers: auth.authHeader(),
    })
    const mapped = mapReview(row)
    reviews.value.unshift(mapped)
    return mapped
  }

  async function update(id: number, data: Partial<Review>) {
    const payload = { ...data, id }
    const row = await $fetch<ReviewRow>('/api/reviews', {
      method: 'PUT',
      body: payload,
      headers: auth.authHeader(),
    })
    const idx = reviews.value.findIndex(r => r.id === id)
    if (idx !== -1) reviews.value[idx] = mapReview(row)
  }

  async function remove(id: number) {
    await $fetch('/api/reviews', {
      method: 'DELETE',
      query: { id },
      headers: auth.authHeader(),
    })
    reviews.value = reviews.value.filter(r => r.id !== id)
  }

  async function toggleVisibility(id: number) {
    const review = reviews.value.find(r => r.id === id)
    if (!review) return
    await update(id, { visible: !review.visible })
  }

  const visible = computed(() => reviews.value.filter(r => r.visible))
  const avgRating = computed(() => {
    const vis = reviews.value.filter(r => r.visible)
    if (!vis.length) return 0
    return vis.reduce((s, r) => s + r.rating, 0) / vis.length
  })

  return { reviews, loading, loaded, ensureLoaded, add, update, remove, toggleVisibility, visible, avgRating }
})
