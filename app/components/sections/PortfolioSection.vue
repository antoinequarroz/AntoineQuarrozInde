<script setup lang="ts">
const { t } = useI18n()
const store = useProjectsStore()

type PortfolioFilter = 'all' | 'web' | 'mobile' | 'cms'

const activeFilter = ref<PortfolioFilter>('all')

const projectCounts = computed<Record<PortfolioFilter, number>>(() => ({
  all: store.projects.length,
  web: store.projects.filter(project => project.category === 'web').length,
  mobile: store.projects.filter(project => project.category === 'mobile').length,
  cms: store.projects.filter(project => project.category === 'cms').length,
}))

const filters = computed(() => [
  { key: 'all' as const, label: t('portfolio.all'), count: projectCounts.value.all },
  { key: 'web' as const, label: t('portfolio.web'), count: projectCounts.value.web },
  { key: 'mobile' as const, label: t('portfolio.mobile'), count: projectCounts.value.mobile },
  { key: 'cms' as const, label: t('portfolio.cms'), count: projectCounts.value.cms },
])

const filtered = computed(() => {
  return [...store.byCategory(activeFilter.value)].sort((a, b) => {
    if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})
</script>

<template>
  <section id="portfolio" class="section-padding section-surface overflow-visible">
    <div class="section-background">
      <div class="section-grid" />
    </div>
    <div class="section-container relative z-10">
      <!-- Header — marges réduites pour coller au carousel -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 40 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 700 } }"
        class="mx-auto mb-6 md:mb-8 flex max-w-3xl flex-col items-center text-center"
      >
        <span class="badge mb-4">{{ t('portfolio.badge') }}</span>
        <h2 class="section-heading">
          <span class="block">{{ t('portfolio.title').split('\n')[0] }}</span>
          <span class="block section-heading-gradient">{{ t('portfolio.title').split('\n')[1] }}</span>
        </h2>
        <p class="section-subtitle mx-auto text-center">{{ t('portfolio.subtitle') }}</p>
      </div>

      <!-- Filters -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :visible="{ opacity: 1, y: 0, transition: { delay: 200, duration: 400 } }"
        class="flex justify-center gap-2 mb-6 flex-wrap"
      >
        <button
          v-for="filter in filters"
          :key="filter.key"
          class="group inline-flex items-center gap-2 rounded-2xl px-5 py-2 text-sm font-semibold transition-all duration-200"
          :class="activeFilter === filter.key
            ? 'bg-gradient-brand text-white shadow-glow-sm'
            : 'bg-white/70 text-gray-500 ring-1 ring-violet-500/10 backdrop-blur dark:bg-white/[0.04] dark:text-gray-400 dark:ring-white/10 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400'"
          @click="activeFilter = filter.key"
        >
          <span>{{ filter.label }}</span>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] transition-colors"
            :class="activeFilter === filter.key
              ? 'bg-white/18 text-white'
              : 'bg-violet-500/10 text-violet-600 dark:text-violet-300'"
          >
            {{ filter.count }}
          </span>
        </button>
      </div>

      <!-- Skeleton while loading -->
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
      <SectionsProjectHelixCarousel v-else :projects="filtered" :active-category="activeFilter" />
    </div>
  </section>
</template>
