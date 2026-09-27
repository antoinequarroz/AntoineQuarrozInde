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
  const enabled = String(config.googleReviewsEnabled || 'false') === 'true'
  const googleMapsUri = placeId
    ? `https://www.google.com/maps/search/?api=1&query=Antoine%20Quarroz&query_place_id=${encodeURIComponent(placeId)}`
    : ''

  setHeader(event, 'cache-control', 'private, no-store')

  if (!apiKey || !placeId) {
    return { configured: false, reviews: [] }
  }

  if (!enabled) {
    return { configured: true, unavailable: true, issue: 'disabled', googleMapsUri, reviews: [] }
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
    return { configured: true, unavailable: true, googleMapsUri, reviews: [] }
  }

  if (!response.ok) {
    // Google may echo credential identifiers in error bodies. Keep production
    // logs actionable without ever persisting upstream response content.
    console.error('Google Places request failed', response.status, response.statusText)
    let errorCode = ''
    try {
      const failure = await response.json() as { error?: { details?: Array<{ reason?: string }> } }
      errorCode = String(failure.error?.details?.[0]?.reason || '')
    }
    catch { /* Upstream may return non-JSON errors. */ }
    return {
      configured: true,
      unavailable: true,
      issue: errorCode === 'CONSUMER_SUSPENDED' ? 'project_suspended' : response.status === 403 ? 'access_denied' : 'unavailable',
      googleMapsUri,
      reviews: [],
    }
  }

  const place = await response.json() as GooglePlaceResponse
  return {
    configured: true,
    placeName: place.displayName?.text || '',
    rating: Number(place.rating || 0),
    userRatingCount: Number(place.userRatingCount || 0),
    googleMapsUri: place.googleMapsUri || googleMapsUri,
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
