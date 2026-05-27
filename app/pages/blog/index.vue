<script setup lang="ts">
useSeoMeta({
  title: 'Blog — Antoine Quarroz',
  description: 'Articles sur le développement web, mobile et les technologies modernes.',
})

const store = useArticlesStore()
const articles = computed(() => store.published)

onMounted(() => store.ensureLoaded())
</script>

<template>
  <div class="pt-28 pb-20">
    <div class="section-container">
      <!-- Header -->
      <div class="text-center mb-16">
        <span class="badge mb-4">Blog</span>
        <h1 class="section-title mb-4">Articles.</h1>
        <p class="section-subtitle mx-auto">Réflexions, tutoriels et retours d'expérience sur le développement web & mobile.</p>
      </div>

      <!-- Articles -->
      <!-- Skeleton while loading -->
      <div v-if="store.loading" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="i in 6"
          :key="i"
          class="rounded-2xl overflow-hidden border border-violet-500/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] animate-pulse"
        >
          <div class="h-44 bg-violet-500/8 dark:bg-violet-400/8" />
          <div class="p-6 space-y-3">
            <div class="h-2.5 w-1/4 rounded-full bg-violet-500/10 dark:bg-white/10" />
            <div class="h-5 w-3/4 rounded-full bg-gray-200 dark:bg-white/10" />
            <div class="h-3 w-full rounded-full bg-gray-100 dark:bg-white/[0.06]" />
            <div class="h-3 w-2/3 rounded-full bg-gray-100 dark:bg-white/[0.06]" />
          </div>
        </div>
      </div>

      <div v-else-if="articles.length" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <article
          v-for="article in articles"
          :key="article.id"
          class="group card-glow overflow-hidden hover:-translate-y-2 transition-transform duration-500"
        >
          <div class="h-44 bg-gradient-to-br from-violet-500/20 to-purple-600/20 dark:from-violet-500/30 dark:to-purple-600/30 relative overflow-hidden">
            <img
              v-if="article.coverImage"
              :src="article.coverImage"
              :alt="article.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            >
            <div v-else class="absolute inset-0 flex items-center justify-center">
              <svg class="w-10 h-10 text-violet-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          <div class="p-6">
            <div class="flex flex-wrap gap-1.5 mb-3">
              <span v-for="tag in article.tags.slice(0, 3)" :key="tag" class="badge text-xs">{{ tag }}</span>
            </div>
            <h2 class="font-display font-bold text-lg mb-2 text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors leading-snug">
              {{ article.title }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed line-clamp-2">
              {{ article.excerpt }}
            </p>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs text-gray-400">
                <span>{{ article.createdAt }}</span>
                <span>·</span>
                <span>{{ article.readTime }} min</span>
              </div>
              <NuxtLink
                :to="`/blog/${article.slug}`"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400"
              >
                Lire
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>

      <div v-else-if="!store.loading" class="text-center py-20 text-gray-400">
        <p class="text-lg">Premiers articles bientôt disponibles...</p>
        <NuxtLink to="/" class="btn-secondary mt-6 mx-auto inline-flex text-sm">← Retour à l'accueil</NuxtLink>
      </div>
    </div>
  </div>
</template>
