export interface GoogleReview {
  id: string
  author: string
  authorUri: string
  avatar: string | null
  rating: number
  content: string
  contentLanguage: string
  originalLanguage: string
  relativePublishTime: string
  publishTime: string
  reviewUri: string
  flagUri: string
  visitDate: string
}

type GoogleReviewsResponse = {
  configured: boolean
  placeName?: string
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  attributions?: Array<{ provider: string, providerUri: string }>
  reviews: GoogleReview[]
}

export const useGoogleReviewsStore = defineStore('google-reviews', () => {
  const { locale } = useI18n()
  const configured = ref(false)
  const loading = ref(false)
  const loadedLocale = ref('')
  const placeName = ref('')
  const rating = ref(0)
  const userRatingCount = ref(0)
  const googleMapsUri = ref('')
  const attributions = ref<Array<{ provider: string, providerUri: string }>>([])
  const reviews = ref<GoogleReview[]>([])

  async function ensureLoaded(force = false) {
    if (loading.value) return
    if (!force && loadedLocale.value === locale.value) return
    loading.value = true
    try {
      const response = await $fetch<GoogleReviewsResponse>('/api/google-reviews', {
        query: { locale: locale.value },
      })
      configured.value = response.configured
      placeName.value = response.placeName || ''
      rating.value = response.rating || 0
      userRatingCount.value = response.userRatingCount || 0
      googleMapsUri.value = response.googleMapsUri || ''
      attributions.value = response.attributions || []
      reviews.value = response.reviews || []
      loadedLocale.value = locale.value
    }
    catch {
      configured.value = false
      reviews.value = []
    }
    finally {
      loading.value = false
    }
  }

  watch(locale, () => ensureLoaded(true))

  return {
    configured,
    loading,
    placeName,
    rating,
    userRatingCount,
    googleMapsUri,
    attributions,
    reviews,
    ensureLoaded,
  }
})
