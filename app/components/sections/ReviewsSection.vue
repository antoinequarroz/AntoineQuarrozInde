<script setup lang="ts">
import type { Review } from '~/stores/reviews'

const { locale } = useI18n()
const store = useReviewsStore()

const reviews = computed(() => store.visible)
const stars = (rating: number) => Array.from({ length: 5 }, (_, i) => i < rating)

const fallbackReviews = computed<Review[]>(() => {
  if (locale.value === 'en') {
    return [
      { id: -1, author: 'Showcase client', company: 'Local business', role: 'Website project', avatar: null, rating: 5, visible: true, createdAt: '' },
      { id: -2, author: 'Mobile client', company: 'Startup', role: 'App project', avatar: null, rating: 5, visible: true, createdAt: '' },
      { id: -3, author: 'CMS client', company: 'SME', role: 'Admin platform', avatar: null, rating: 5, visible: true, createdAt: '' },
      { id: -4, author: 'Founder', company: 'Digital product', role: 'Product strategy', avatar: null, rating: 5, visible: true, createdAt: '' },
      { id: -5, author: 'Independent', company: 'Personal brand', role: 'Brand website', avatar: null, rating: 5, visible: true, createdAt: '' },
      { id: -6, author: 'Marketing lead', company: 'Service company', role: 'Conversion redesign', avatar: null, rating: 5, visible: true, createdAt: '' },
    ].map((review, index) => ({
      ...review,
      content: [
        'A clear process, clean execution and a website that immediately felt more premium.',
        'The interface is fast, polished and much easier for our users to understand.',
        'The admin experience is simple, reliable and exactly adapted to our workflow.',
        'The project moved quickly without losing quality or clarity.',
        'The result gave the brand a much stronger and more professional presence.',
        'The redesign made the offer clearer and the calls to action more effective.',
      ][index],
    }))
  }

  if (locale.value === 'de') {
    return [
      { id: -1, author: 'Website-Kunde', company: 'Lokales Unternehmen', role: 'Webprojekt', avatar: null, rating: 5, visible: true, createdAt: '' },
      { id: -2, author: 'Mobile-Kunde', company: 'Startup', role: 'App-Projekt', avatar: null, rating: 5, visible: true, createdAt: '' },
      { id: -3, author: 'CMS-Kunde', company: 'KMU', role: 'Admin-Plattform', avatar: null, rating: 5, visible: true, createdAt: '' },
      { id: -4, author: 'Gründer', company: 'Digitales Produkt', role: 'Produktstrategie', avatar: null, rating: 5, visible: true, createdAt: '' },
      { id: -5, author: 'Selbstständig', company: 'Personal Brand', role: 'Brand Website', avatar: null, rating: 5, visible: true, createdAt: '' },
      { id: -6, author: 'Marketing Lead', company: 'Dienstleistung', role: 'Conversion Redesign', avatar: null, rating: 5, visible: true, createdAt: '' },
    ].map((review, index) => ({
      ...review,
      content: [
        'Klarer Prozess, saubere Umsetzung und eine Website mit deutlich hochwertigerer Wirkung.',
        'Das Interface ist schnell, präzise und für unsere Nutzer viel verständlicher.',
        'Die Admin-Oberfläche ist einfach, zuverlässig und genau an unseren Workflow angepasst.',
        'Das Projekt kam schnell voran, ohne Qualität oder Klarheit zu verlieren.',
        'Das Ergebnis gibt der Marke einen viel stärkeren und professionelleren Auftritt.',
        'Das Redesign macht das Angebot klarer und die Handlungsaufforderungen wirksamer.',
      ][index],
    }))
  }

  return [
    { id: -1, author: 'Client vitrine', company: 'Entreprise locale', role: 'Site web', avatar: null, rating: 5, visible: true, createdAt: '' },
    { id: -2, author: 'Client mobile', company: 'Startup', role: 'Application', avatar: null, rating: 5, visible: true, createdAt: '' },
    { id: -3, author: 'Client CMS', company: 'PME', role: 'Plateforme admin', avatar: null, rating: 5, visible: true, createdAt: '' },
    { id: -4, author: 'Fondateur', company: 'Produit digital', role: 'Stratégie produit', avatar: null, rating: 5, visible: true, createdAt: '' },
    { id: -5, author: 'Indépendant', company: 'Personal brand', role: 'Site de marque', avatar: null, rating: 5, visible: true, createdAt: '' },
    { id: -6, author: 'Responsable marketing', company: 'Services', role: 'Refonte conversion', avatar: null, rating: 5, visible: true, createdAt: '' },
  ].map((review, index) => ({
    ...review,
    content: [
      'Process clair, exécution propre et un site qui paraît immédiatement plus premium.',
      'L’interface est rapide, soignée et beaucoup plus simple à comprendre pour nos utilisateurs.',
      'L’espace admin est simple, fiable et parfaitement adapté à notre manière de travailler.',
      'Le projet a avancé vite sans perdre en qualité ni en clarté.',
      'Le résultat donne à la marque une présence beaucoup plus forte et professionnelle.',
      'La refonte rend l’offre plus claire et les appels à l’action plus efficaces.',
    ][index],
  }))
})

const displayReviews = computed(() => reviews.value.length ? reviews.value : fallbackReviews.value)
const displayRating = computed(() => reviews.value.length ? store.avgRating : 5)

const content = computed(() => {
  if (locale.value === 'en') {
    return {
      badge: 'Testimonials',
      titleA: 'Clients talk about',
      titleB: 'the experience.',
      subtitle: 'Real feedback from projects built with care, clarity and performance.',
      reviewsLabel: 'reviews',
    }
  }
  if (locale.value === 'de') {
    return {
      badge: 'Kundenstimmen',
      titleA: 'Kunden sprechen über',
      titleB: 'die Zusammenarbeit.',
      subtitle: 'Echtes Feedback zu Projekten mit Klarheit, Design und Performance.',
      reviewsLabel: 'Bewertungen',
    }
  }
  return {
    badge: 'Témoignages',
    titleA: 'Ce que disent',
    titleB: 'mes clients.',
    subtitle: 'Des retours concrets sur des projets pensés avec soin, clarté et performance.',
    reviewsLabel: 'avis',
  }
})

function columnItems(index: number) {
  const list = displayReviews.value.filter((_, itemIndex) => itemIndex % 3 === index)
  return list.length ? list : displayReviews.value
}

function authorInitials(review: Review) {
  return review.author
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
}
</script>

<template>
  <section id="reviews" class="section-padding section-surface">
    <div class="section-background">
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      <div class="section-grid" />
    </div>

    <div class="section-container relative z-10">
      <div
        v-motion
        :initial="{ opacity: 0, y: 28 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 680 } }"
        class="section-header"
      >
        <span class="badge mb-4">{{ content.badge }}</span>
        <h2 class="section-heading">
          {{ content.titleA }}<br>
          <span class="section-heading-gradient">
            {{ content.titleB }}
          </span>
        </h2>
        <p class="section-subtitle mx-auto">{{ content.subtitle }}</p>
        <div class="mt-4 flex items-center justify-center gap-2">
          <div class="flex gap-0.5">
            <span v-for="i in 5" :key="i" class="text-lg text-yellow-400">★</span>
          </div>
          <span class="text-sm font-medium text-gray-500 dark:text-white/50">
            {{ displayRating.toFixed(1) }}/5 · {{ displayReviews.length }} {{ content.reviewsLabel }}
          </span>
        </div>
      </div>

      <div class="reviews-mask mx-auto mt-8 md:mt-12 grid max-h-[520px] md:max-h-[720px] max-w-6xl grid-cols-1 gap-4 md:gap-5 overflow-hidden md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="columnIndex in 3"
          :key="columnIndex"
          class="reviews-column"
          :class="{ 'hidden md:block': columnIndex === 2, 'hidden lg:block': columnIndex === 3 }"
          :style="{ '--duration': `${columnIndex === 1 ? 17 : columnIndex === 2 ? 21 : 19}s` }"
        >
          <div class="reviews-track flex flex-col gap-5 pb-5">
            <template v-for="copy in 2" :key="copy">
              <article
                v-for="review in columnItems(columnIndex - 1)"
                :key="`${copy}-${review.id}`"
                class="group rounded-[1.4rem] md:rounded-[1.75rem] border border-violet-500/15 bg-white/80 p-4 md:p-6 shadow-xl shadow-violet-500/10 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/25 dark:border-white/10 dark:bg-white/[0.045] dark:shadow-black/20"
              >
                <div class="mb-5 flex gap-0.5">
                  <span
                    v-for="(filled, idx) in stars(review.rating)"
                    :key="idx"
                    :class="filled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'"
                    class="text-sm"
                  >
                    ★
                  </span>
                </div>

                <p class="text-sm leading-relaxed text-gray-900 dark:text-white/90">
                  “{{ review.content }}”
                </p>

                <div class="mt-6 flex items-center gap-3">
                  <img
                    v-if="review.avatar"
                    :src="review.avatar"
                    :alt="review.author"
                    class="h-11 w-11 rounded-full object-cover"
                    loading="lazy"
                  >
                  <div
                    v-else
                    class="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 font-display text-sm font-bold text-white"
                  >
                    {{ authorInitials(review) }}
                  </div>
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-gray-950 dark:text-white">{{ review.author }}</div>
                    <div class="truncate text-xs text-gray-500 dark:text-white/50">
                      {{ review.role }}{{ review.company ? `, ${review.company}` : '' }}
                    </div>
                  </div>
                </div>
              </article>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reviews-mask {
  mask-image: linear-gradient(to bottom, transparent, black 16%, black 84%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 16%, black 84%, transparent);
}

.reviews-column {
  min-height: 520px;
}

.reviews-track {
  animation: reviewsScroll var(--duration, 18s) linear infinite;
}

.reviews-column:hover .reviews-track {
  animation-play-state: paused;
}

@keyframes reviewsScroll {
  to {
    transform: translateY(-50%);
  }
}

@media (min-width: 768px) {
  .reviews-column {
    min-height: 720px;
  }
}
</style>
