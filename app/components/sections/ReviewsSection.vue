<script setup lang="ts">
import type { Review } from '~/stores/reviews'
import { linkifyReviewText } from '~/utils/reviewLinks'

const { locale } = useI18n()
const store = useReviewsStore()
const googleStore = useGoogleReviewsStore()
const reduceMotion = usePreferredReducedMotion()
const railHost = ref<HTMLElement | null>(null)
const railViewport = ref<HTMLElement | null>(null)
const railTrack = ref<HTMLElement | null>(null)
const railProgress = ref(0)
const railOffset = ref(0)

type DisplayReview = {
  id: string
  source: 'manual' | 'google' | 'demo'
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

const demoReviews: DisplayReview[] = import.meta.dev
  ? [
      {
        id: 'demo-1', source: 'demo', author: 'Profil de démonstration', avatar: null, rating: 5,
        content: 'Cette carte sert uniquement à vérifier le mouvement et la mise en page locale. Elle ne sera jamais visible sur le site public.',
        role: 'Aperçu local', company: 'Non publié', authorUri: '', relativePublishTime: '', reviewUri: '', flagUri: '', visitDate: '', translated: false,
      },
      {
        id: 'demo-2', source: 'demo', author: 'Deuxième aperçu', avatar: null, rating: 5,
        content: 'Les prochains témoignages authentiques prendront automatiquement cette place avec le nom, le poste, l’entreprise et les liens actifs.',
        role: 'Aperçu local', company: 'Non publié', authorUri: '', relativePublishTime: '', reviewUri: '', flagUri: '', visitDate: '', translated: false,
      },
    ]
  : []

const reviews = computed(() => {
  const published = [
    ...googleReviews.value,
    ...(locale.value === 'fr' ? manualReviews.value : []),
  ]
  return published.length ? published : demoReviews
})
const railHeight = computed(() => `${100 + Math.max(1, reviews.value.length) * 54}svh`)
const displayRating = computed(() => googleStore.rating)
const displayCount = computed(() => googleStore.userRatingCount)

const content = computed(() => {
  if (locale.value === 'en') {
    return {
      badge: 'Client testimonials', titleA: 'Their experience.', titleB: 'In their own words.',
      subtitle: 'Authentic feedback from clients I have worked with.', reviewsLabel: 'reviews', source: 'Read the original review',
      report: 'Report', translated: 'Translated review', visited: 'Visited', rating: 'out of 5', profile: 'View all reviews on Google',
      verified: 'Published on Google Maps', manual: 'Verified client testimonial', demo: 'Local preview · not published', fallback: 'Read verified client feedback directly on my Google Business Profile.',
      swipe: 'Swipe to browse testimonials', progress: 'Testimonial scroll progress', clientRole: 'Client collaboration', ctaEyebrow: 'The next story',
      ctaTitle: 'Your project could be next.', ctaBody: 'New testimonials are added only after the client has approved their name, role and words.',
      ctaAction: 'Talk about your project',
    }
  }
  if (locale.value === 'de') {
    return {
      badge: 'Kundenstimmen', titleA: 'Ihre Erfahrung.', titleB: 'In ihren eigenen Worten.',
      subtitle: 'Authentische Rückmeldungen von Kunden, mit denen ich gearbeitet habe.', reviewsLabel: 'Bewertungen', source: 'Originalbewertung lesen',
      report: 'Melden', translated: 'Übersetzte Bewertung', visited: 'Besucht', rating: 'von 5', profile: 'Alle Bewertungen auf Google ansehen',
      verified: 'Auf Google Maps veröffentlicht', manual: 'Bestätigte Kundenstimme', demo: 'Lokale Vorschau · nicht veröffentlicht', fallback: 'Lesen Sie verifizierte Kundenbewertungen direkt in meinem Google-Unternehmensprofil.',
      swipe: 'Wischen, um Kundenstimmen zu entdecken', progress: 'Fortschritt der Kundenstimmen', clientRole: 'Kundenzusammenarbeit', ctaEyebrow: 'Die nächste Geschichte',
      ctaTitle: 'Ihr Projekt könnte das nächste sein.', ctaBody: 'Neue Kundenstimmen erscheinen erst nach Freigabe von Name, Funktion und Inhalt.',
      ctaAction: 'Projekt besprechen',
    }
  }
  return {
    badge: 'Témoignages clients', titleA: 'Leur expérience.', titleB: 'Avec leurs propres mots.',
    subtitle: 'Des retours authentiques de personnes avec qui j’ai travaillé.', reviewsLabel: 'avis', source: 'Lire l’avis original',
    report: 'Signaler', translated: 'Avis traduit', visited: 'Visite', rating: 'sur 5', profile: 'Voir tous les avis sur Google',
    verified: 'Publié sur Google Maps', manual: 'Témoignage client vérifié', demo: 'Aperçu local · non publié', fallback: 'Retrouvez les avis vérifiés directement sur ma fiche Google.',
    swipe: 'Balayez pour parcourir les témoignages', progress: 'Progression dans les témoignages', clientRole: 'Client accompagné', ctaEyebrow: 'La prochaine histoire',
    ctaTitle: 'Votre projet pourrait être le prochain.', ctaBody: 'Chaque nouveau témoignage est publié seulement après validation du nom, du poste et des mots du client.',
    ctaAction: 'Parler de votre projet',
  }
})

function authorInitials(review: Pick<Review, 'author'>) {
  return review.author.split(' ').filter(Boolean).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase()
}

function formatVisitDate(value: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00:00`))
}

function authorDetails(review: DisplayReview) {
  return [review.role, review.company].filter(Boolean).join(' · ') || content.value.clientRole
}

let animationFrame = 0
let resizeObserver: ResizeObserver | undefined

function updateRail() {
  cancelAnimationFrame(animationFrame)
  animationFrame = requestAnimationFrame(() => {
    const host = railHost.value
    const viewport = railViewport.value
    const track = railTrack.value
    if (!host || !viewport || !track || window.innerWidth < 1024 || reduceMotion.value === 'reduce') {
      railProgress.value = 0
      railOffset.value = 0
      return
    }

    const rect = host.getBoundingClientRect()
    const scrollable = Math.max(1, host.offsetHeight - window.innerHeight)
    const progress = Math.min(1, Math.max(0, -rect.top / scrollable))
    const maxOffset = Math.max(0, track.scrollWidth - viewport.clientWidth)
    railProgress.value = progress
    railOffset.value = -maxOffset * progress
  })
}

watch(reviews, async () => {
  await nextTick()
  updateRail()
})

onMounted(() => {
  window.addEventListener('scroll', updateRail, { passive: true })
  window.addEventListener('resize', updateRail, { passive: true })
  resizeObserver = new ResizeObserver(updateRail)
  if (railTrack.value) resizeObserver.observe(railTrack.value)
  updateRail()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  window.removeEventListener('scroll', updateRail)
  window.removeEventListener('resize', updateRail)
  resizeObserver?.disconnect()
})
</script>

<template>
  <section v-if="!reviews.length && googleStore.googleMapsUri" id="reviews" class="reviews-showcase section-padding overflow-hidden" aria-labelledby="reviews-title">
    <div aria-hidden="true" class="reviews-aurora reviews-aurora-left" />
    <div aria-hidden="true" class="reviews-aurora reviews-aurora-right" />
    <div aria-hidden="true" class="reviews-grid" />
    <div class="section-container relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-14">
      <div>
        <span class="badge mb-5">{{ content.badge }}</span>
        <h2 id="reviews-title" class="section-heading text-left">{{ content.titleA }}<br><span class="section-heading-gradient review-heading-gradient">{{ content.titleB }}</span></h2>
        <p class="mt-5 max-w-xl text-base leading-7 text-gray-600 dark:text-white/60">{{ content.fallback }}</p>
      </div>
      <a :href="googleStore.googleMapsUri" target="_blank" rel="noopener noreferrer" class="review-primary-link">
        {{ content.profile }}
        <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M8 7h9v9" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </a>
    </div>
  </section>

  <section v-else-if="reviews.length" id="reviews" class="reviews-showcase" aria-labelledby="reviews-title">
    <div aria-hidden="true" class="reviews-aurora reviews-aurora-left" />
    <div aria-hidden="true" class="reviews-aurora reviews-aurora-right" />
    <div aria-hidden="true" class="reviews-grid" />

    <header class="reviews-intro section-container relative z-10 flex min-h-[52svh] flex-col items-center justify-center py-20 text-center">
      <span class="badge mb-6">{{ content.badge }}</span>
      <h2 id="reviews-title" class="section-heading max-w-4xl">{{ content.titleA }}<br><span class="section-heading-gradient review-heading-gradient">{{ content.titleB }}</span></h2>
      <p class="mt-6 max-w-2xl text-base leading-7 text-gray-600 dark:text-white/60">{{ content.subtitle }}</p>
      <a v-if="googleReviews.length && googleStore.googleMapsUri" :href="googleStore.googleMapsUri" target="_blank" rel="noopener noreferrer" class="review-score mt-7 inline-flex items-center gap-3">
        <span class="text-sm tracking-[0.08em] text-amber-400" aria-hidden="true">★★★★★</span>
        <strong class="font-display text-lg text-gray-950 dark:text-white">{{ displayRating.toFixed(1) }}</strong>
        <span class="text-sm text-gray-500 dark:text-white/50">{{ displayCount }} {{ content.reviewsLabel }}</span>
      </a>
    </header>

    <div ref="railHost" class="reviews-rail-host relative z-10" :style="{ height: railHeight }">
      <div class="reviews-sticky">
        <div class="section-container flex items-center justify-between gap-6 pt-24 lg:pt-28">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">{{ content.badge }}</p>
          <p class="text-xs text-gray-500 dark:text-white/45 lg:hidden">{{ content.swipe }}</p>
          <div class="hidden items-center gap-3 lg:flex">
            <span class="text-xs text-gray-500 dark:text-white/45">{{ String(Math.max(1, Math.ceil(railProgress * (reviews.length + 1)))).padStart(2, '0') }} / {{ String(reviews.length + 1).padStart(2, '0') }}</span>
            <div class="h-px w-28 overflow-hidden bg-gray-300 dark:bg-white/15" role="progressbar" :aria-label="content.progress" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(railProgress * 100)">
              <div class="h-full origin-left bg-gradient-to-r from-violet-500 to-fuchsia-500" :style="{ transform: `scaleX(${railProgress})` }" />
            </div>
          </div>
        </div>

        <div ref="railViewport" class="reviews-track-viewport" tabindex="0" :aria-label="content.swipe">
          <div ref="railTrack" class="reviews-track" :style="{ transform: `translate3d(${railOffset}px, 0, 0)` }">
            <article v-for="review in reviews" :key="review.id" class="review-card">
              <div aria-hidden="true" class="review-quote-mark">“</div>
              <div class="relative z-10 flex h-full flex-col">
                <div class="flex items-center justify-between gap-4">
                  <span class="review-source-pill"><span class="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,.9)]" />{{ review.source === 'google' ? content.verified : review.source === 'demo' ? content.demo : content.manual }}</span>
                  <span v-if="review.rating" role="img" class="text-sm tracking-[0.08em] text-amber-400" :aria-label="`${review.rating} ${content.rating}`"><span aria-hidden="true">{{ '★'.repeat(review.rating) }}</span></span>
                </div>

                <blockquote class="mt-8 flex-1 font-display text-lg font-medium leading-[1.55] text-gray-950 sm:text-xl xl:text-[1.35rem] dark:text-white">
                  <template v-for="(part, partIndex) in linkifyReviewText(review.content)" :key="`${review.id}-${partIndex}`">
                    <a v-if="part.type === 'link'" :href="part.href" target="_blank" rel="noopener noreferrer nofollow" class="review-inline-link">{{ part.text }}</a><template v-else>{{ part.text }}</template>
                  </template>
                </blockquote>

                <div v-if="review.relativePublishTime || review.visitDate || review.translated" class="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-white/45">
                  <span v-if="review.relativePublishTime">{{ review.relativePublishTime }}</span>
                  <span v-if="review.visitDate">{{ content.visited }} : {{ formatVisitDate(review.visitDate) }}</span>
                  <span v-if="review.translated">{{ content.translated }}</span>
                </div>

                <footer class="mt-7 flex items-center gap-4 border-t border-gray-200/80 pt-6 dark:border-white/10">
                  <img v-if="review.avatar" :src="review.avatar" :alt="review.author" class="h-12 w-12 rounded-full object-cover ring-2 ring-white dark:ring-white/10" loading="lazy" referrerpolicy="no-referrer">
                  <div v-else class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-display text-sm font-bold text-white">{{ authorInitials(review) }}</div>
                  <div class="min-w-0 flex-1">
                    <a v-if="review.authorUri" :href="review.authorUri" target="_blank" rel="noopener noreferrer" class="font-semibold text-gray-950 underline-offset-4 hover:underline dark:text-white">{{ review.author }}</a>
                    <div v-else class="font-semibold text-gray-950 dark:text-white">{{ review.author }}</div>
                    <div class="mt-1 text-sm text-gray-500 dark:text-white/50">{{ authorDetails(review) }}</div>
                  </div>
                  <a v-if="review.reviewUri" :href="review.reviewUri" target="_blank" rel="noopener noreferrer" class="review-external-button" :aria-label="content.source">
                    <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M8 7h9v9" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </a>
                </footer>
              </div>
            </article>

            <aside class="review-card review-cta-card">
              <div class="relative z-10 flex h-full flex-col justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">{{ content.ctaEyebrow }}</p>
                  <h3 class="mt-6 max-w-md font-display text-3xl font-semibold leading-tight text-gray-950 sm:text-4xl dark:text-white">{{ content.ctaTitle }}</h3>
                  <p class="mt-6 max-w-md text-base leading-7 text-gray-600 dark:text-white/60">{{ content.ctaBody }}</p>
                </div>
                <div class="mt-10 flex flex-wrap gap-3">
                  <a href="#contact" class="review-primary-link">{{ content.ctaAction }}<svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" /></svg></a>
                  <a v-if="googleStore.googleMapsUri" :href="googleStore.googleMapsUri" target="_blank" rel="noopener noreferrer" class="review-secondary-link">{{ content.profile }}</a>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div v-if="googleReviews.length" class="section-container mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-white/40">
          <a v-for="attribution in googleStore.attributions" :key="`${attribution.provider}-${attribution.providerUri}`" :href="attribution.providerUri || googleStore.googleMapsUri" target="_blank" rel="noopener noreferrer" class="underline-offset-4 hover:underline">{{ attribution.provider }}</a>
          <a v-for="review in googleReviews.filter(item => item.flagUri)" :key="`${review.id}-flag`" :href="review.flagUri" target="_blank" rel="noopener noreferrer" class="underline-offset-4 hover:underline">{{ content.report }}</a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.review-heading-gradient { background-image: linear-gradient(135deg, #7c3aed, #d946ef); }
.reviews-showcase { position: relative; overflow: clip; background: linear-gradient(180deg, rgb(250 250 255) 0%, rgb(250 245 255) 100%); }
.reviews-grid { position: absolute; inset: 0; opacity: .32; background-image: linear-gradient(rgba(139, 92, 246, .08) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, .08) 1px, transparent 1px); background-size: 48px 48px; mask-image: linear-gradient(to bottom, transparent, black 14%, black 88%, transparent); }
.reviews-aurora { position: absolute; width: 34rem; height: 34rem; border-radius: 9999px; filter: blur(95px); opacity: .13; pointer-events: none; }
.reviews-aurora-left { left: -18rem; top: 12%; background: #7c3aed; }
.reviews-aurora-right { right: -16rem; bottom: 0; background: #a855f7; }
.reviews-sticky { position: sticky; top: 0; height: 100svh; overflow: hidden; }
.reviews-track-viewport { height: calc(100svh - 8.5rem); overflow: hidden; outline: none; }
.reviews-track-viewport:focus-visible { box-shadow: inset 0 0 0 2px rgb(167 139 250); }
.reviews-track { display: flex; width: max-content; height: 100%; align-items: center; gap: clamp(3rem, 7vw, 7rem); padding: 0 11vw; will-change: transform; }
.review-card { position: relative; width: clamp(38rem, 48vw, 49rem); height: clamp(28rem, 68svh, 31rem); flex: 0 0 auto; overflow: hidden; border: 1px solid rgb(255 255 255 / .75); border-radius: 2rem; background: rgb(255 255 255 / .9); padding: clamp(1.65rem, 2.5vw, 2.5rem); box-shadow: 0 32px 90px -42px rgb(30 20 70 / .5); backdrop-filter: blur(20px); scroll-snap-align: center; transition: border-color 220ms ease, box-shadow 220ms ease; }
.review-card:nth-child(odd) { transform: translateY(-3.5svh); }
.review-card:nth-child(even) { transform: translateY(3.5svh); }
.review-card:hover { border-color: rgb(167 139 250 / .35); box-shadow: 0 40px 110px -46px rgb(167 139 250 / .4); }
.review-card::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(125deg, rgba(255, 255, 255, .8), transparent 32%, transparent 72%, rgba(167, 139, 250, .06)); }
.review-quote-mark { position: absolute; right: 1.5rem; top: -4.5rem; font-family: Georgia, serif; font-size: 17rem; line-height: 1; color: rgba(124, 58, 237, .07); user-select: none; }
.review-source-pill { display: inline-flex; align-items: center; gap: .5rem; border: 1px solid rgb(139 92 246 / .2); border-radius: 9999px; background: rgb(139 92 246 / .07); padding: .375rem .75rem; font-size: .75rem; font-weight: 600; color: rgb(109 40 217); }
.review-inline-link { display: inline-flex; min-height: 2.75rem; align-items: center; color: rgb(124 58 237); text-decoration: underline; text-decoration-thickness: .08em; text-underline-offset: .16em; overflow-wrap: anywhere; transition: color 150ms ease; }
.review-inline-link:hover { color: rgb(109 40 217); }
.review-inline-link:focus-visible { border-radius: .2rem; outline: 2px solid rgb(167 139 250); outline-offset: 3px; }
.review-external-button { display: grid; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; place-items: center; border: 1px solid rgb(107 114 128 / .2); border-radius: 9999px; color: rgb(124 58 237); transition: transform 150ms ease, border-color 150ms ease, background-color 150ms ease; }
.review-external-button:hover { transform: translateY(-2px); border-color: rgb(167 139 250 / .7); background: rgb(139 92 246 / .07); }
.review-external-button:active { transform: scale(.96); }
.review-primary-link, .review-secondary-link { display: inline-flex; min-height: 3rem; align-items: center; justify-content: center; gap: .65rem; border-radius: 1rem; padding: .75rem 1.25rem; font-size: .875rem; font-weight: 700; transition: transform 150ms ease, color 150ms ease, background-color 150ms ease, box-shadow 150ms ease; }
.review-primary-link { background: linear-gradient(135deg, rgb(124 58 237), rgb(192 38 211)); color: white; box-shadow: 0 15px 35px -18px rgb(124 58 237 / .8); }
.review-primary-link:hover { transform: translateY(-2px); box-shadow: 0 20px 42px -18px rgb(109 40 217 / .8); }
.review-primary-link:active, .review-secondary-link:active { transform: scale(.96); }
.review-secondary-link { border: 1px solid rgb(139 92 246 / .22); color: rgb(109 40 217); }
.review-secondary-link:hover { background: rgb(139 92 246 / .08); }
.review-cta-card { background: linear-gradient(145deg, rgb(255 255 255 / .94), rgb(250 245 255 / .9)); }

@media (max-width: 1023px) {
  .reviews-rail-host { height: auto !important; padding-bottom: 5rem; }
  .reviews-sticky { position: relative; height: auto; overflow: visible; }
  .reviews-track-viewport { height: auto; margin-top: 2rem; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
  .reviews-track-viewport::-webkit-scrollbar { display: none; }
  .reviews-track { gap: 1rem; padding: 0 max(1.25rem, calc((100vw - 74rem) / 2)) 1.25rem; transform: none !important; will-change: auto; }
  .review-card { width: min(88vw, 46rem); height: auto; min-height: 22rem; transform: none !important; }
}

@media (max-width: 639px) {
  .review-card { min-height: 24rem; padding: 1.35rem; }
  .review-card blockquote { font-size: 1rem; line-height: 1.5; }
  .review-quote-mark { right: .75rem; top: -2.25rem; font-size: 10rem; }
}

@media (prefers-reduced-motion: reduce) {
  .reviews-rail-host { height: auto !important; padding-bottom: 5rem; }
  .reviews-sticky { position: relative; height: auto; overflow: visible; }
  .reviews-track-viewport { overflow-x: auto; scroll-snap-type: x mandatory; }
  .reviews-track { transform: none !important; will-change: auto; }
  .review-card { transform: none !important; transition: none; }
  .review-inline-link, .review-external-button, .review-primary-link, .review-secondary-link { transition: none; }
}
</style>

<style>
html.dark .reviews-showcase { background: linear-gradient(180deg, #080711 0%, #0c0b18 100%); }
html.dark .reviews-showcase .reviews-grid { opacity: .2; }
html.dark .reviews-showcase .review-card { border-color: rgb(255 255 255 / .1); background: rgb(12 11 24 / .9); }
html.dark .reviews-showcase .review-card::after { background: linear-gradient(125deg, rgba(255, 255, 255, .04), transparent 35%, transparent 72%, rgba(167, 139, 250, .04)); }
html.dark .reviews-showcase .review-source-pill { color: rgb(221 214 254); }
html.dark .reviews-showcase .review-inline-link { color: rgb(196 181 253); }
html.dark .reviews-showcase .review-secondary-link { border-color: rgb(255 255 255 / .12); color: rgb(221 214 254); }
html.dark .reviews-showcase .review-cta-card { background: linear-gradient(145deg, rgb(17 15 34 / .96), rgb(30 20 52 / .92)); }
</style>
