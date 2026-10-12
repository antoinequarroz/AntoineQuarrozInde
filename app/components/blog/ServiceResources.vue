<script setup lang="ts">
import { articlePath, hubArticles } from '~~/shared/utils/articleLinking'
const props = defineProps<{ servicePath: string }>()
// Keep the SSR payload small: service pages need links, not every article body.
// Read anonymously so an authenticated preview never includes private drafts.
const { data: articles } = await useAsyncData('public-article-link-index', async () => {
  const rows = await $fetch<Array<{ slug: string; title: string; published: boolean; published_at: string | null }>>('/api/articles')
  return rows.map(row => ({ slug: row.slug, title: row.title, published: row.published, publishedAt: row.published_at }))
})
const resources = computed(() => hubArticles(articles.value ?? [], props.servicePath))
</script>

<template>
  <section v-if="resources.length" data-service-resources class="mt-12 border-t border-violet-500/15 pt-10">
    <p class="text-xs font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">Préparer votre projet</p>
    <h2 class="mt-3 font-display text-2xl font-bold text-gray-950 dark:text-white">Les guides pour avancer avec un besoin clair</h2>
    <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">Retrouvez les points à vérifier avant notre échange, puis approfondissez le sujet qui vous concerne.</p>
    <ul class="mt-6 grid gap-4 sm:grid-cols-2">
      <li v-for="resource in resources" :key="resource.slug">
        <NuxtLink :to="articlePath(resource)" class="flex h-full min-h-16 items-center justify-between gap-4 rounded-2xl border border-violet-500/15 bg-white/70 p-5 font-semibold leading-6 text-violet-800 transition-colors hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500 dark:bg-white/[0.04] dark:text-violet-200 dark:hover:bg-violet-500/10">
          <span>{{ resource.title }}</span><span aria-hidden="true" class="shrink-0">→</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
