<script setup lang="ts">
const route = useRoute()
const store = useArticlesStore()

await store.ensureLoaded()

const article = computed(() => store.published.find(a => a.slug === route.params.slug))

if (!article.value) {
  throw createError({ statusCode: 404, message: 'Article non trouvé' })
}

useSeoMeta({
  title: () => `${article.value?.title} — Antoine Quarroz`,
  description: () => article.value?.excerpt,
  ogTitle: () => `${article.value?.title} — Antoine Quarroz`,
  ogDescription: () => article.value?.excerpt,
  ogImage: () => article.value?.coverImage ?? undefined,
  twitterCard: 'summary_large_image',
})

// Simple markdown renderer (headings, bold, paragraphs)
function renderMarkdown(md: string): string {
  if (!md) return ''
  return md
    .replace(/^### (.+)$/gm, '<h3 class="font-display font-bold text-xl mt-6 mb-3 text-gray-900 dark:text-white">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-display font-bold text-2xl mt-8 mb-4 text-gray-900 dark:text-white">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-display font-bold text-3xl mt-4 mb-6 text-gray-900 dark:text-white">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-mono">$1</code>')
    .replace(/\n\n/g, '</p><p class="mb-4 text-gray-600 dark:text-gray-300 leading-relaxed">')
    .replace(/^(?!<[h1-6]|<\/p>)(.+)$/, '<p class="mb-4 text-gray-600 dark:text-gray-300 leading-relaxed">$1</p>')
}
</script>

<template>
  <div v-if="article" class="pt-28 pb-20">
    <div class="section-container">
      <div class="max-w-3xl mx-auto">
        <!-- Back -->
        <NuxtLink to="/blog" class="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 mb-8 transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux articles
        </NuxtLink>

        <!-- Header -->
        <div class="mb-10">
          <div class="flex flex-wrap gap-2 mb-4">
            <span v-for="tag in article.tags" :key="tag" class="badge">{{ tag }}</span>
          </div>
          <h1 class="font-display font-bold text-3xl sm:text-4xl text-gray-900 dark:text-white mb-4 leading-tight">
            {{ article.title }}
          </h1>
          <div class="flex items-center gap-4 text-sm text-gray-400">
            <span>{{ article.createdAt }}</span>
            <span>·</span>
            <span>{{ article.readTime }} min de lecture</span>
          </div>
        </div>

        <!-- Cover image area -->
        <div class="h-64 sm:h-80 rounded-3xl overflow-hidden bg-gradient-to-br from-violet-500/20 to-purple-600/20 dark:from-violet-500/30 dark:to-purple-600/30 relative flex items-center justify-center mb-10">
          <img
            v-if="article.coverImage"
            :src="article.coverImage"
            :alt="article.title"
            class="w-full h-full object-cover"
          >
          <svg v-else class="w-16 h-16 text-violet-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <!-- Content -->
        <div class="prose-content">
          <p class="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6 font-medium">
            {{ article.excerpt }}
          </p>
          <!-- eslint-disable vue/no-v-html -->
          <div class="text-gray-600 dark:text-gray-300" v-html="renderMarkdown(article.content)" />
        </div>

        <!-- Footer -->
        <div class="mt-12 pt-8 border-t border-gray-200/70 dark:border-white/5">
          <NuxtLink to="/blog" class="btn-secondary text-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Tous les articles
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
