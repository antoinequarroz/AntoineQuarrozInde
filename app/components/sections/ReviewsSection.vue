<script setup lang="ts">
import type { Review } from '~/stores/reviews'

const { locale } = useI18n()
const store = useReviewsStore()
const googleStore = useGoogleReviewsStore()
const activeIndex = ref(0)
const slideDirection = ref<'next' | 'previous'>('next')
const isPaused = ref(false)
const reduceMotion = usePreferredReducedMotion()

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

const reviews = computed(() => [
  ...googleReviews.value,
  ...(locale.value === 'fr' ? manualReviews.value : []),
])
const activeReview = computed(() => reviews.value[activeIndex.value] ?? reviews.value[0])
const displayRating = computed(() => googleStore.rating)
const displayCount = computed(() => googleStore.userRatingCount)

const content = computed(() => {
  if (locale.value === 'en') {
    return {
      badge: 'Client testimonials', titleA: 'A collaboration', titleB: 'told by clients.',
      subtitle: 'Authentic feedback from clients I have worked with.', reviewsLabel: 'reviews',
      source: 'Read the original review', report: 'Report', sorted: 'Reviews shown and ordered by relevance by Google Maps.',
      translated: 'Translated review', visited: 'Visited', rating: 'out of 5', previous: 'Previous review', next: 'Next review',
      profile: 'View all reviews on Google', verified: 'Review published on Google Maps', select: 'Show review by', manual: 'Client testimonial',
      fallback: 'Read verified client feedback directly on my Google Business Profile.',
    }
  }
  if (locale.value === 'de') {
    return {
      badge: 'Kundenstimmen', titleA: 'Eine Zusammenarbeit,', titleB: 'von Kunden erzählt.',
      subtitle: 'Authentische Rückmeldungen von Kunden, mit denen ich gearbeitet habe.', reviewsLabel: 'Bewertungen',
      source: 'Originalbewertung lesen', report: 'Melden', sorted: 'Bewertungen werden von Google Maps nach Relevanz angezeigt und sortiert.',
      translated: 'Übersetzte Bewertung', visited: 'Besucht', rating: 'von 5', previous: 'Vorherige Bewertung', next: 'Nächste Bewertung',
      profile: 'Alle Bewertungen auf Google ansehen', verified: 'Auf Google Maps veröffentlichte Bewertung', select: 'Bewertung anzeigen von', manual: 'Kundenstimme',
      fallback: 'Lesen Sie verifizierte Kundenbewertungen direkt in meinem Google-Unternehmensprofil.',
    }
  }
  return {
    badge: 'Témoignages clients', titleA: 'Une collaboration,', titleB: 'racontée par mes clients.',
    subtitle: 'Des retours authentiques de personnes avec qui j’ai travaillé.', reviewsLabel: 'avis',
    source: 'Lire l’avis original', report: 'Signaler', sorted: 'Avis affichés et classés par pertinence par Google Maps.',
    translated: 'Avis traduit', visited: 'Visite', rating: 'sur 5', previous: 'Avis précédent', next: 'Avis suivant',
    profile: 'Voir tous les avis sur Google', verified: 'Avis publié sur Google Maps', select: 'Afficher l’avis de', manual: 'Témoignage client',
    fallback: 'Retrouvez les avis de mes clients directement sur ma fiche Google.',
  }
})

function authorInitials(review: Pick<Review, 'author'>) {
  return review.author.split(' ').filter(Boolean).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase()
}

function formatVisitDate(value: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00:00`))
}

function goTo(index: number) {
  const total = reviews.value.length
  if (!total) return
  const nextIndex = (index + total) % total
  if (nextIndex === activeIndex.value) return
  slideDirection.value = index < activeIndex.value ? 'previous' : 'next'
  activeIndex.value = nextIndex
}

function previous() {
  slideDirection.value = 'previous'
  activeIndex.value = (activeIndex.value - 1 + reviews.value.length) % reviews.value.length
}

function next() {
  slideDirection.value = 'next'
  activeIndex.value = (activeIndex.value + 1) % reviews.value.length
}

let touchStartX: number | null = null
function onTouchStart(event: TouchEvent) {
  touchStartX = event.changedTouches[0]?.clientX ?? null
  isPaused.value = true
}
function onTouchEnd(event: TouchEvent) {
  const endX = event.changedTouches[0]?.clientX
  if (touchStartX !== null && endX !== undefined && Math.abs(endX - touchStartX) > 48 && reviews.value.length > 1) {
    if (endX < touchStartX) next()
    else previous()
  }
  touchStartX = null
  isPaused.value = false
}

watch(reviews, (items) => {
  if (activeIndex.value >= items.length) activeIndex.value = 0
})

let autoplay: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  autoplay = setInterval(() => {
    if (!isPaused.value && reduceMotion.value !== 'reduce' && reviews.value.length > 1) next()
  }, 7000)
})
onBeforeUnmount(() => {
  if (autoplay) clearInterval(autoplay)
})
</script>

<template>
  <section v-if="!activeReview && googleStore.googleMapsUri" id="reviews" class="reviews-showcase section-padding overflow-hidden" aria-labelledby="reviews-title">
    <div aria-hidden="true" class="reviews-aurora reviews-aurora-left" />
    <div aria-hidden="true" class="reviews-aurora reviews-aurora-right" />
    <div aria-hidden="true" class="reviews-grid" />
    <div class="section-container relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-14">
      <div>
        <span class="badge mb-5">{{ content.badge }}</span>
        <h2 id="reviews-title" class="section-heading text-left">
          {{ content.titleA }}<br>
          <span class="section-heading-gradient">{{ content.titleB }}</span>
        </h2>
        <p class="mt-5 max-w-xl text-base leading-7 text-gray-600 dark:text-white/60">{{ content.fallback }}</p>
      </div>
      <a
        :href="googleStore.googleMapsUri"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-cyan-500/25 bg-white px-6 py-3 text-sm font-semibold text-cyan-900 shadow-lg shadow-cyan-950/10 transition-[color,background-color,box-shadow] duration-150 hover:bg-cyan-50 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:bg-white/10 dark:text-cyan-100 dark:hover:bg-white/15 dark:focus-visible:ring-offset-[#080711]"
      >
        {{ content.profile }}
        <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M8 7h9v9" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </a>
    </div>
  </section>
  <section v-if="activeReview" id="reviews" class="reviews-showcase section-padding overflow-hidden" aria-labelledby="reviews-title">
    <div aria-hidden="true" class="reviews-aurora reviews-aurora-left" />
    <div aria-hidden="true" class="reviews-aurora reviews-aurora-right" />
    <div aria-hidden="true" class="reviews-grid" />

    <div class="section-container relative z-10">
      <div class="grid items-center gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
        <div v-motion :initial="{ opacity: 0, x: -24 }" :visible-once="{ opacity: 1, x: 0, transition: { duration: 650 } }">
          <span class="badge mb-5">{{ content.badge }}</span>
          <h2 id="reviews-title" class="section-heading text-left">
            {{ content.titleA }}<br>
            <span class="section-heading-gradient">{{ content.titleB }}</span>
          </h2>
          <p class="mt-5 max-w-xl text-base leading-7 text-gray-600 dark:text-white/60">{{ content.subtitle }}</p>

          <a
            v-if="googleReviews.length && googleStore.googleMapsUri"
            :href="googleStore.googleMapsUri"
            target="_blank"
            rel="noopener noreferrer"
            class="review-score group mt-8 inline-flex items-center gap-4"
          >
            <span class="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-lg shadow-cyan-950/10 dark:bg-white/10">
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-7 w-7"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.24-2.53c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.08 12c0-.66.11-1.3.32-1.9V7.47H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.52L6.4 13.9Z"/><path fill="#EA4335" d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.48L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z"/></svg>
            </span>
            <span>
              <span class="flex items-center gap-2">
                <strong class="font-display text-2xl text-gray-950 dark:text-white">{{ displayRating.toFixed(1) }}</strong>
                <span aria-hidden="true" class="tracking-[0.08em] text-amber-400">★★★★★</span>
              </span>
              <span class="mt-0.5 block text-sm text-gray-500 transition-colors group-hover:text-cyan-700 dark:text-white/50 dark:group-hover:text-cyan-300">{{ displayCount }} {{ content.reviewsLabel }} · {{ content.profile }}</span>
            </span>
          </a>
          <a
            v-else-if="googleStore.googleMapsUri"
            :href="googleStore.googleMapsUri"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-800 underline underline-offset-4 transition-colors duration-150 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:text-cyan-200 dark:hover:text-cyan-100"
          >
            {{ content.profile }}
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M8 7h9v9" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </a>
        </div>

        <div
          v-motion
          :initial="{ opacity: 0, y: 32, scale: 0.98 }"
          :visible-once="{ opacity: 1, y: 0, scale: 1, transition: { duration: 720, delay: 120 } }"
          class="relative"
          @mouseenter="isPaused = true"
          @mouseleave="isPaused = false"
          @focusin="isPaused = true"
          @focusout="isPaused = false"
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        >
          <div aria-hidden="true" class="absolute inset-5 translate-x-5 translate-y-5 rounded-[2rem] border border-violet-400/15 bg-violet-500/[0.04]" />
          <article class="review-card relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_32px_90px_-42px_rgba(30,20,70,.5)] backdrop-blur-xl sm:p-9 dark:border-white/10 dark:bg-[#0c0b18]/90">
            <div aria-hidden="true" class="review-quote-mark">“</div>
            <div class="relative z-10 flex h-full min-h-[360px] flex-col">
              <div class="flex items-center justify-between gap-4">
                <span class="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/[0.07] px-3 py-1.5 text-xs font-semibold text-cyan-800 dark:text-cyan-200">
                  <span class="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,.9)]" />
                  {{ activeReview.source === 'google' ? content.verified : content.manual }}
                </span>
                <span v-if="activeReview.source === 'google'" class="text-sm tracking-[0.08em] text-amber-400" :aria-label="`${activeReview.rating} ${content.rating}`"><span aria-hidden="true">{{ '★'.repeat(activeReview.rating) }}</span></span>
              </div>

              <Transition :name="slideDirection === 'next' ? 'review-slide-next' : 'review-slide-previous'" mode="out-in">
                <div :key="activeReview.id" class="flex flex-1 flex-col">
                  <blockquote class="mt-8 flex-1 font-display text-xl font-medium leading-[1.5] text-gray-950 sm:text-2xl sm:leading-[1.48] dark:text-white">
                    {{ activeReview.content }}
                  </blockquote>

                  <div v-if="activeReview.relativePublishTime || activeReview.visitDate || activeReview.translated" class="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-white/45">
                    <span v-if="activeReview.relativePublishTime">{{ activeReview.relativePublishTime }}</span>
                    <span v-if="activeReview.visitDate">{{ content.visited }} : {{ formatVisitDate(activeReview.visitDate) }}</span>
                    <span v-if="activeReview.translated">{{ content.translated }}</span>
                  </div>

                  <footer class="mt-7 flex flex-wrap items-center gap-4 border-t border-gray-200/80 pt-6 dark:border-white/10">
                    <img v-if="activeReview.avatar" :src="activeReview.avatar" :alt="activeReview.author" class="h-12 w-12 rounded-full object-cover ring-2 ring-white dark:ring-white/10" loading="lazy" referrerpolicy="no-referrer">
                    <div v-else class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 font-display text-sm font-bold text-white">{{ authorInitials(activeReview) }}</div>
                    <div class="min-w-0 flex-1">
                      <a v-if="activeReview.authorUri" :href="activeReview.authorUri" target="_blank" rel="noopener noreferrer" class="font-semibold text-gray-950 underline-offset-4 hover:underline dark:text-white">{{ activeReview.author }}</a>
                      <div v-else class="font-semibold text-gray-950 dark:text-white">{{ activeReview.author }}</div>
                      <div v-if="activeReview.role || activeReview.company" class="mt-0.5 text-sm text-gray-500 dark:text-white/50">{{ activeReview.role }}{{ activeReview.company ? `, ${activeReview.company}` : '' }}</div>
                      <a v-else-if="activeReview.reviewUri" :href="activeReview.reviewUri" target="_blank" rel="noopener noreferrer" class="mt-0.5 inline-block text-sm text-cyan-700 underline-offset-4 hover:underline dark:text-cyan-300">{{ content.source }}</a>
                    </div>
                  </footer>
                </div>
              </Transition>
            </div>
          </article>

          <div v-if="reviews.length > 1" class="relative mt-5 flex items-center justify-between gap-4">
            <div class="flex -space-x-2" role="tablist" :aria-label="content.badge">
              <button
                v-for="(review, index) in reviews"
                :key="review.id"
                type="button"
                role="tab"
                :aria-selected="index === activeIndex"
                :aria-label="`${content.select} ${review.author}`"
                class="review-avatar-button relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border-2 bg-gray-100 text-xs font-bold text-gray-700 transition-[transform,border-color,opacity] duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:bg-white/10 dark:text-white dark:focus-visible:ring-offset-[#080711]"
                :class="index === activeIndex ? 'z-10 scale-110 border-cyan-400 opacity-100' : 'border-white opacity-60 hover:opacity-100 dark:border-[#080711]'"
                @click="goTo(index)"
              >
                <img v-if="review.avatar" :src="review.avatar" alt="" class="h-full w-full object-cover" loading="lazy" referrerpolicy="no-referrer">
                <span v-else>{{ authorInitials(review) }}</span>
              </button>
            </div>

            <div class="flex items-center gap-2">
              <button type="button" class="review-nav-button" :aria-label="content.previous" @click="previous">
                <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <span class="min-w-12 text-center font-mono text-xs text-gray-500 dark:text-white/45">{{ String(activeIndex + 1).padStart(2, '0') }} / {{ String(reviews.length).padStart(2, '0') }}</span>
              <button type="button" class="review-nav-button" :aria-label="content.next" @click="next">
                <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="googleReviews.length" class="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-xs text-gray-500 dark:text-white/40">
        <span>{{ content.sorted }}</span>
        <a v-for="attribution in googleStore.attributions" :key="`${attribution.provider}-${attribution.providerUri}`" :href="attribution.providerUri || googleStore.googleMapsUri" target="_blank" rel="noopener noreferrer" class="underline-offset-4 hover:underline">{{ attribution.provider }}</a>
        <a v-if="activeReview.flagUri" :href="activeReview.flagUri" target="_blank" rel="noopener noreferrer" class="underline-offset-4 hover:underline">{{ content.report }}</a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reviews-showcase {
  position: relative;
  background: linear-gradient(180deg, rgb(250 250 255) 0%, rgb(244 247 252) 100%);
}
.reviews-grid {
  position: absolute; inset: 0; opacity: .32;
  background-image: linear-gradient(rgba(99, 102, 241, .08) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, .08) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
}
.reviews-aurora {
  position: absolute; width: 34rem; height: 34rem; border-radius: 9999px;
  filter: blur(95px); opacity: .13; pointer-events: none;
}
.reviews-aurora-left { left: -18rem; top: 12%; background: #7c3aed; }
.reviews-aurora-right { right: -16rem; bottom: 0; background: #06b6d4; }
.review-card::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(125deg, rgba(255, 255, 255, .8), transparent 32%, transparent 72%, rgba(34, 211, 238, .06));
}
.review-quote-mark {
  position: absolute; right: 1.5rem; top: -3rem; font-family: Georgia, serif;
  font-size: 15rem; line-height: 1; color: rgba(124, 58, 237, .07); user-select: none;
}
.review-nav-button {
  display: grid; height: 2.75rem; width: 2.75rem; place-items: center; border-radius: 9999px;
  border: 1px solid rgba(107, 114, 128, .2); color: rgb(55 65 81);
  transition: transform 180ms ease, border-color 180ms ease, color 180ms ease, background-color 180ms ease;
}
.review-nav-button:hover { transform: translateY(-2px); border-color: rgb(34 211 238 / .7); color: rgb(8 145 178); background: rgb(255 255 255 / .7); }
.review-nav-button:focus-visible { outline: 2px solid rgb(34 211 238); outline-offset: 3px; }
.review-slide-next-enter-active, .review-slide-next-leave-active,
.review-slide-previous-enter-active, .review-slide-previous-leave-active {
  transition: opacity 260ms ease-out, transform 260ms cubic-bezier(.2, 0, 0, 1);
}
.review-slide-next-enter-from, .review-slide-previous-leave-to { opacity: 0; transform: translateX(56px); }
.review-slide-next-leave-to, .review-slide-previous-enter-from { opacity: 0; transform: translateX(-56px); }

@media (prefers-reduced-motion: reduce) {
  .review-slide-next-enter-active, .review-slide-next-leave-active,
  .review-slide-previous-enter-active, .review-slide-previous-leave-active,
  .review-avatar-button, .review-nav-button { transition: none; }
}
</style>

<style>
html.dark .reviews-showcase { background: linear-gradient(180deg, #080711 0%, #0c0b18 100%); }
html.dark .reviews-showcase .reviews-grid { opacity: .2; }
html.dark .reviews-showcase .review-card::after { background: linear-gradient(125deg, rgba(255, 255, 255, .04), transparent 35%, transparent 72%, rgba(34, 211, 238, .04)); }
html.dark .reviews-showcase .review-nav-button { border-color: rgba(255, 255, 255, .12); color: rgba(255, 255, 255, .75); }
html.dark .reviews-showcase .review-nav-button:hover { background: rgba(255, 255, 255, .06); color: rgb(103 232 249); }
</style>
