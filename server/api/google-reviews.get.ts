type GoogleLocalizedText = {
  text?: string
  languageCode?: string
}

type GoogleReview = {
  name?: string
  relativePublishTimeDescription?: string
  text?: GoogleLocalizedText
  originalText?: GoogleLocalizedText
  rating?: number
  authorAttribution?: {
    displayName?: string
    uri?: string
    photoUri?: string
  }
  publishTime?: string
  flagContentUri?: string
  googleMapsUri?: string
  visitDate?: { year?: number, month?: number }
}

type GooglePlaceResponse = {
  displayName?: GoogleLocalizedText
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  reviews?: GoogleReview[]
  attributions?: Array<{ provider?: string, providerUri?: string }>
}

const supportedLanguages = new Set(['fr', 'en', 'de'])

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = String(config.googlePlacesApiKey || '')
  const placeId = String(config.googlePlaceId || '')

  setHeader(event, 'cache-control', 'private, no-store')

  if (!apiKey || !placeId) {
    return { configured: false, reviews: [] }
  }

  const requestedLanguage = String(getQuery(event).locale || 'fr').toLowerCase()
  const languageCode = supportedLanguages.has(requestedLanguage) ? requestedLanguage : 'fr'
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`)
  url.searchParams.set('languageCode', languageCode)
  url.searchParams.set('regionCode', 'CH')

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'displayName,rating,userRatingCount,googleMapsUri,reviews,attributions',
      },
    })
  }
  catch {
    throw createError({ statusCode: 502, message: 'Google Reviews is temporarily unavailable' })
  }

  if (!response.ok) {
    console.error('Google Places request failed', response.status, await response.text())
    throw createError({ statusCode: 502, message: 'Google Reviews configuration could not be validated' })
  }

  const place = await response.json() as GooglePlaceResponse
  return {
    configured: true,
    placeName: place.displayName?.text || '',
    rating: Number(place.rating || 0),
    userRatingCount: Number(place.userRatingCount || 0),
    googleMapsUri: place.googleMapsUri || '',
    attributions: (place.attributions ?? []).map(attribution => ({
      provider: attribution.provider || '',
      providerUri: attribution.providerUri || '',
    })),
    reviews: (place.reviews ?? []).flatMap((review) => {
      const author = review.authorAttribution?.displayName?.trim()
      const content = review.text?.text?.trim()
      const reviewUri = review.googleMapsUri?.trim()
      if (!author || !content || !reviewUri) return []

      return [{
        id: review.name || reviewUri,
        author,
        authorUri: review.authorAttribution?.uri || '',
        avatar: review.authorAttribution?.photoUri || null,
        rating: Math.min(5, Math.max(1, Math.round(Number(review.rating || 5)))),
        content,
        contentLanguage: review.text?.languageCode || '',
        originalLanguage: review.originalText?.languageCode || '',
        relativePublishTime: review.relativePublishTimeDescription || '',
        publishTime: review.publishTime || '',
        reviewUri,
        flagUri: review.flagContentUri || '',
        visitDate: review.visitDate?.year && review.visitDate?.month
          ? `${review.visitDate.year}-${String(review.visitDate.month).padStart(2, '0')}`
          : '',
      }]
    }),
  }
})
