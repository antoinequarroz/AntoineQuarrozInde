<script setup lang="ts">
const { t, locale } = useI18n()
const store = useProjectsStore()

type PortfolioFilter = 'all' | 'web' | 'mobile' | 'cms' | 'software'

const activeFilter = ref<PortfolioFilter>('all')

const projectCounts = computed<Record<PortfolioFilter, number>>(() => ({
  all: store.portfolio.length,
  web: store.portfolio.filter(project => project.category === 'web').length,
  mobile: store.portfolio.filter(project => project.category === 'mobile').length,
  cms: store.portfolio.filter(project => project.category === 'cms').length,
  software: store.portfolio.filter(project => project.category === 'software').length,
}))

const filters = computed(() => [
  { key: 'all' as const, label: t('portfolio.all'), count: projectCounts.value.all },
  { key: 'web' as const, label: t('portfolio.web'), count: projectCounts.value.web },
  { key: 'mobile' as const, label: t('portfolio.mobile'), count: projectCounts.value.mobile },
  { key: 'cms' as const, label: t('portfolio.cms'), count: projectCounts.value.cms },
  { key: 'software' as const, label: t('portfolio.software'), count: projectCounts.value.software },
].filter(filter => filter.count > 0))

const filtered = computed(() => {
  return [...store.byCategory(activeFilter.value)].sort((a, b) => {
    if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

</script>

<template>
  <section id="portfolio" class="pb-14 md:pb-24 lg:pb-28 section-surface overflow-visible">
    <div class="section-background">
      <div class="section-grid" />
    </div>
    <div class="section-container relative z-10">
      <div class="relative pt-2 md:pb-4 md:pt-3">
      <!-- Header — marges réduites pour coller au carousel -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 40 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 700 } }"
        class="relative z-30 mx-auto mb-2 max-[430px]:mb-1.5 md:mb-2 flex max-w-3xl flex-col items-center text-center"
      >
        <span class="badge mb-3 max-[430px]:mb-2.5">{{ t('portfolio.badge') }}</span>
        <h2 class="section-heading">
          <span class="block">{{ t('portfolio.title').split('\n')[0] }}</span>
          <span class="block section-heading-gradient">{{ t('portfolio.title').split('\n')[1] }}</span>
        </h2>
        <p class="section-subtitle mx-auto text-center max-[430px]:max-w-[32ch]">{{ t('portfolio.subtitle') }}</p>
      </div>

      <!-- Filters -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :visible="{ opacity: 1, y: 0, transition: { delay: 200, duration: 400 } }"
        v-if="filters.length > 1"
        class="relative z-30 mb-3 max-[430px]:mb-4 flex flex-wrap justify-center gap-1.5 md:gap-2 md:mb-2"
      >
        <button
          v-for="filter in filters"
          :key="filter.key"
          class="group inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-3.5 max-[390px]:px-3 py-1.5 text-xs md:px-5 md:py-2 md:text-sm font-semibold transition-[background-color,color,box-shadow] duration-200"
          :class="activeFilter === filter.key
            ? 'bg-gradient-brand text-white shadow-glow-sm'
            : 'bg-white/70 text-violet-800 ring-1 ring-violet-500/10 backdrop-blur dark:bg-white/[0.04] dark:text-violet-200 dark:ring-white/10 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-100'"
          @click="activeFilter = filter.key"
        >
          <span>{{ filter.label }}</span>
          <span
            class="rounded-full px-2 py-0.5 text-xs transition-colors"
            :class="activeFilter === filter.key
              ? 'bg-white/18 text-white'
              : 'bg-violet-500/10 text-violet-600 dark:text-violet-300'"
          >
            {{ filter.count }}
          </span>
        </button>
      </div>
      </div>

        <template v-if="store.loading">
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="i in 3"
              :key="i"
              class="rounded-[1.9rem] overflow-hidden border border-violet-500/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] animate-pulse"
            >
              <div class="h-56 bg-violet-500/8 dark:bg-violet-400/8" />
              <div class="p-5 space-y-3">
                <div class="h-2.5 w-1/4 rounded-full bg-violet-500/10 dark:bg-white/10" />
                <div class="h-5 w-2/3 rounded-full bg-gray-200 dark:bg-white/10" />
                <div class="h-3 w-full rounded-full bg-gray-100 dark:bg-white/[0.06]" />
                <div class="h-3 w-4/5 rounded-full bg-gray-100 dark:bg-white/[0.06]" />
              </div>
            </div>
          </div>
        </template>
        <div v-else class="mt-2 md:mt-4">
          <SectionsProjectHelixCarousel :projects="filtered" :active-category="activeFilter" />
        </div>
        <div v-if="locale === 'fr' && activeFilter === 'all' && !store.portfolio.some(project => project.slug === 'hermes-cockpit')" class="relative z-20 mx-auto mt-8 max-w-4xl rounded-3xl border border-violet-500/20 bg-white/80 p-6 shadow-xl shadow-violet-500/5 dark:border-white/10 dark:bg-[#191629] md:flex md:items-center md:justify-between md:gap-8 md:p-8">
          <div>
            <span class="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">Projet personnel · macOS</span>
            <h3 class="mt-2 font-display text-2xl font-bold text-gray-950 dark:text-white">Hermes Cockpit</h3>
            <p class="mt-2 max-w-xl text-sm leading-relaxed text-gray-700 dark:text-gray-300">Un cockpit pour organiser mes agents IA, suivre leurs missions et relire leurs résultats. Premier compagnon web iPhone en lecture seule.</p>
          </div>
          <NuxtLink to="/projets/hermes-cockpit" class="mt-5 inline-flex min-h-11 shrink-0 items-center rounded-2xl bg-gradient-brand px-5 py-3 text-sm font-semibold text-white shadow-glow-sm transition-opacity hover:opacity-90 md:mt-0">Découvrir le projet <span class="ml-2" aria-hidden="true">→</span></NuxtLink>
        </div>
    </div>
  </section>
</template>
