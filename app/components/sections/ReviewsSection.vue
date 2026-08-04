<script setup lang="ts">
import type { Review } from '~/stores/reviews'

const { locale } = useI18n()
const store = useReviewsStore()

const reviews = computed(() => store.visible)
const stars = (rating: number) => Array.from({ length: 5 }, (_, i) => i < rating)
const displayRating = computed(() => store.avgRating)

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
  <section v-if="reviews.length" id="reviews" class="section-padding section-surface">
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
            {{ displayRating.toFixed(1) }}/5 · {{ reviews.length }} {{ content.reviewsLabel }}
          </span>
        </div>
      </div>

      <div class="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-4 md:mt-12 md:grid-cols-2 lg:grid-cols-3">
              <article
                v-for="review in reviews"
                :key="review.id"
                class="group rounded-[1.2rem] md:rounded-[1.75rem] border border-violet-500/15 bg-white/80 p-3.5 md:p-6 shadow-xl shadow-violet-500/10 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/25 dark:border-white/10 dark:bg-white/[0.045] dark:shadow-black/20"
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

                <p class="text-sm md:text-sm leading-relaxed line-clamp-4 md:line-clamp-none text-gray-900 dark:text-white/90">
                  “{{ review.content }}”
                </p>

                <div class="mt-4 md:mt-6 flex items-center gap-3">
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
      </div>
    </div>
  </section>
</template>
