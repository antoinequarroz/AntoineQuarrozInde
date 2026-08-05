<script setup lang="ts">
import type { Review } from '~/stores/reviews'

const { locale } = useI18n()
const store = useReviewsStore()
const googleStore = useGoogleReviewsStore()

type DisplayReview = {
  id: string
  source: 'manual' | 'google'
  author: string
  avatar: string | null
  rating: number
  content: string
  role: string
  company: string
  authorUri: string
  relativePublishTime: string
  reviewUri: string
  flagUri: string
  visitDate: string
  translated: boolean
}

const manualReviews = computed<DisplayReview[]>(() => store.visible.map(review => ({
  id: `manual-${review.id}`,
  source: 'manual',
  author: review.author,
  avatar: review.avatar,
  rating: review.rating,
  content: review.content,
  role: review.role,
  company: review.company,
  authorUri: '',
  relativePublishTime: '',
  reviewUri: '',
  flagUri: '',
  visitDate: '',
  translated: false,
})))

const googleReviews = computed<DisplayReview[]>(() => googleStore.reviews.map(review => ({
  id: `google-${review.id}`,
  source: 'google',
  author: review.author,
  avatar: review.avatar,
  rating: review.rating,
  content: review.content,
  role: '',
  company: '',
  authorUri: review.authorUri,
  relativePublishTime: review.relativePublishTime,
  reviewUri: review.reviewUri,
  flagUri: review.flagUri,
  visitDate: review.visitDate,
  translated: Boolean(review.originalLanguage && review.contentLanguage && review.originalLanguage !== review.contentLanguage),
})))

const reviews = computed(() => [...googleReviews.value, ...manualReviews.value])
const stars = (rating: number) => Array.from({ length: 5 }, (_, i) => i < rating)
const displayRating = computed(() => googleReviews.value.length ? googleStore.rating : store.avgRating)
const displayCount = computed(() => googleReviews.value.length ? googleStore.userRatingCount : manualReviews.value.length)

const content = computed(() => {
  if (locale.value === 'en') {
    return {
      badge: 'Testimonials', titleA: 'Clients talk about', titleB: 'the experience.',
      subtitle: 'Real feedback from projects built with care, clarity and performance.', reviewsLabel: 'reviews',
      source: 'View on Google Maps', report: 'Report', sorted: 'Google reviews are selected and ordered by relevance by Google Maps.',
      translated: 'Translated review', visited: 'Visited',
    }
  }
  if (locale.value === 'de') {
    return {
      badge: 'Kundenstimmen', titleA: 'Kunden sprechen über', titleB: 'die Zusammenarbeit.',
      subtitle: 'Echtes Feedback zu Projekten mit Klarheit, Design und Performance.', reviewsLabel: 'Bewertungen',
      source: 'Auf Google Maps ansehen', report: 'Melden', sorted: 'Google-Bewertungen werden von Google Maps nach Relevanz ausgewählt und sortiert.',
      translated: 'Übersetzte Bewertung', visited: 'Besucht',
    }
  }
  return {
    badge: 'Témoignages', titleA: 'Ce que disent', titleB: 'mes clients.',
    subtitle: 'Des retours concrets sur des projets pensés avec soin, clarté et performance.', reviewsLabel: 'avis',
    source: 'Voir sur Google Maps', report: 'Signaler', sorted: 'Les avis Google sont sélectionnés et classés par pertinence par Google Maps.',
    translated: 'Avis traduit', visited: 'Visite',
  }
})

function authorInitials(review: Pick<Review, 'author'>) {
  return review.author.split(' ').filter(Boolean).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase()
}

function formatVisitDate(value: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00:00`))
}
</script>

<template>
  <section v-if="reviews.length" id="reviews" class="section-padding section-surface">
    <div class="section-background">
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      <div class="section-grid" />
    </div>

    <div class="section-container relative z-10">
      <div v-motion :initial="{ opacity: 0, y: 28 }" :visible="{ opacity: 1, y: 0, transition: { duration: 680 } }" class="section-header">
        <span class="badge mb-4">{{ content.badge }}</span>
        <h2 class="section-heading">{{ content.titleA }}<br><span class="section-heading-gradient">{{ content.titleB }}</span></h2>
        <p class="section-subtitle mx-auto">{{ content.subtitle }}</p>
        <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
          <div class="flex gap-0.5" aria-hidden="true"><span v-for="i in 5" :key="i" class="text-lg text-yellow-400">★</span></div>
          <span class="text-sm font-medium text-gray-500 dark:text-white/60">{{ displayRating.toFixed(1) }}/5 · {{ displayCount }} {{ content.reviewsLabel }}</span>
          <a v-if="googleReviews.length && googleStore.googleMapsUri" :href="googleStore.googleMapsUri" target="_blank" rel="noopener noreferrer" translate="no" class="text-sm text-[#5e5e5e] underline-offset-4 hover:underline dark:text-white/70">Google Maps</a>
        </div>
      </div>

      <p v-if="googleReviews.length" class="mx-auto mt-7 max-w-2xl text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ content.sorted }}</p>

      <div class="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-4 md:mt-12 md:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="review in reviews"
          :key="review.id"
          class="group rounded-[1.2rem] border bg-white/80 p-4 shadow-xl backdrop-blur transition-[transform,border-color] duration-300 hover:-translate-y-1 md:rounded-[1.75rem] md:p-6 dark:bg-white/[0.045] dark:shadow-black/20"
          :class="review.source === 'google' ? 'border-cyan-500/25 shadow-cyan-500/5 hover:border-cyan-500/40 dark:border-cyan-300/20' : 'border-violet-500/15 shadow-violet-500/10 hover:border-violet-500/25 dark:border-white/10'"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex gap-0.5" :aria-label="`${review.rating} sur 5`">
              <span v-for="(filled, idx) in stars(review.rating)" :key="idx" :class="filled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'" class="text-sm" aria-hidden="true">★</span>
            </div>
            <span v-if="review.source === 'google'" translate="no" class="text-xs font-normal text-[#5e5e5e] dark:text-white/70">Google Maps</span>
          </div>

          <p class="mt-5 line-clamp-4 text-sm leading-relaxed text-gray-900 md:line-clamp-none dark:text-white/90">“{{ review.content }}”</p>

          <div v-if="review.relativePublishTime || review.visitDate || review.translated" class="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-white/55">
            <span v-if="review.relativePublishTime">{{ review.relativePublishTime }}</span>
            <span v-if="review.visitDate">{{ content.visited }} : {{ formatVisitDate(review.visitDate) }}</span>
            <span v-if="review.translated">{{ content.translated }}</span>
          </div>

          <div class="mt-5 flex items-center gap-3 md:mt-6">
            <img v-if="review.avatar" :src="review.avatar" :alt="review.author" class="h-11 w-11 rounded-full object-cover" loading="lazy" referrerpolicy="no-referrer">
            <div v-else class="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 font-display text-sm font-bold text-white">{{ authorInitials(review) }}</div>
            <div class="min-w-0 flex-1">
              <a v-if="review.authorUri" :href="review.authorUri" target="_blank" rel="noopener noreferrer" class="block truncate font-semibold text-gray-950 hover:underline dark:text-white">{{ review.author }}</a>
              <div v-else class="truncate font-semibold text-gray-950 dark:text-white">{{ review.author }}</div>
              <div v-if="review.role || review.company" class="truncate text-xs text-gray-500 dark:text-white/50">{{ review.role }}{{ review.company ? `, ${review.company}` : '' }}</div>
            </div>
          </div>

          <div v-if="review.source === 'google'" class="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-cyan-500/10 pt-4 text-xs">
            <a :href="review.reviewUri" target="_blank" rel="noopener noreferrer" class="font-semibold text-cyan-700 hover:underline dark:text-cyan-300">{{ content.source }}</a>
            <a v-if="review.flagUri" :href="review.flagUri" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:underline dark:text-gray-400">{{ content.report }}</a>
          </div>
        </article>
      </div>

      <div v-if="googleReviews.length && googleStore.attributions.length" class="mx-auto mt-5 flex max-w-6xl flex-wrap justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <a v-for="attribution in googleStore.attributions" :key="`${attribution.provider}-${attribution.providerUri}`" :href="attribution.providerUri || googleStore.googleMapsUri" target="_blank" rel="noopener noreferrer" class="hover:underline">{{ attribution.provider }}</a>
      </div>
    </div>
  </section>
</template>
