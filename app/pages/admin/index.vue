<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const projects = useProjectsStore()
const articles = useArticlesStore()
const reviews = useReviewsStore()

const stats = computed(() => [
  {
    label: 'Projets',
    value: projects.projects.length,
    sub: `${projects.featured.length} mis en avant`,
    icon: 'folder',
    href: '/admin/projects',
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-500/10',
  },
  {
    label: 'Articles',
    value: articles.articles.length,
    sub: `${articles.published.length} publiés`,
    icon: 'file-text',
    href: '/admin/articles',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
  },
  {
    label: 'Avis clients',
    value: reviews.reviews.length,
    sub: `${reviews.visible.length} visibles`,
    icon: 'star',
    href: '/admin/reviews',
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-500/10',
  },
  {
    label: 'Note moyenne',
    value: reviews.avgRating.toFixed(1),
    sub: 'sur 5 étoiles',
    icon: 'trending-up',
    href: '/admin/reviews',
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10',
  },
])

const recentProjects = computed(() => projects.projects.slice(0, 5))
const recentArticles = computed(() => articles.articles.slice(0, 5))
</script>

<template>
  <div class="space-y-6">

    <!-- Welcome banner -->
    <div class="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-purple-700 p-6 shadow-lg">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/20 blur-2xl" />
        <div class="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      </div>
      <div class="relative flex items-center justify-between">
        <div>
          <h1 class="font-display font-bold text-xl text-white mb-1">Bonjour, Antoine 👋</h1>
          <p class="text-sm text-violet-200">Gérez votre contenu et vos projets depuis ici.</p>
        </div>
        <div class="hidden sm:flex gap-2">
          <NuxtLink
            to="/admin/projects?new=1"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25
                   text-white text-xs font-semibold transition-all backdrop-blur-sm border border-white/20"
          >
            + Projet
          </NuxtLink>
          <NuxtLink
            to="/admin/articles?new=1"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25
                   text-white text-xs font-semibold transition-all backdrop-blur-sm border border-white/20"
          >
            + Article
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink
        v-for="stat in stats"
        :key="stat.label"
        :to="stat.href"
        class="group bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06]
               rounded-xl p-5 hover:border-violet-200 dark:hover:border-violet-500/20
               hover:shadow-sm transition-all duration-200"
      >
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ stat.label }}</span>
          <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" :class="[stat.iconBg, stat.iconColor]">
            <svg v-if="stat.icon === 'folder'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <svg v-else-if="stat.icon === 'file-text'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
            </svg>
            <svg v-else-if="stat.icon === 'star'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <svg v-else-if="stat.icon === 'trending-up'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
        </div>
        <div class="font-display font-bold text-3xl text-gray-900 dark:text-white leading-none mb-1.5">{{ stat.value }}</div>
        <div class="text-xs text-gray-400 dark:text-gray-500">{{ stat.sub }}</div>
      </NuxtLink>
    </div>

    <!-- Content grid -->
    <div class="grid lg:grid-cols-2 gap-4">

      <!-- Recent projects -->
      <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Projets récents</span>
          <NuxtLink to="/admin/projects" class="text-xs text-violet-500 hover:text-violet-600 font-medium transition-colors">Voir tout →</NuxtLink>
        </div>
        <div class="flex-1">
          <div v-if="recentProjects.length">
            <div
              v-for="project in recentProjects"
              :key="project.id"
              class="flex items-center gap-3 px-5 py-3 border-b border-gray-50 dark:border-white/[0.03] last:border-0
                     hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
            >
              <div class="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ project.title }}</p>
                <p class="text-xs text-gray-400 truncate">{{ project.category }}{{ project.tags.length ? ` · ${project.tags.slice(0, 2).join(', ')}` : '' }}</p>
              </div>
              <span
                class="text-[11px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0"
                :class="project.featured
                  ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400'
                  : 'bg-gray-50 text-gray-400 dark:bg-white/[0.04] dark:text-gray-500'"
              >
                {{ project.featured ? '★ featured' : project.category }}
              </span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-12 gap-2">
            <p class="text-sm text-gray-400">Aucun projet</p>
            <NuxtLink to="/admin/projects?new=1" class="text-xs text-violet-500 hover:text-violet-600 font-medium transition-colors">+ Créer le premier</NuxtLink>
          </div>
        </div>
      </div>

      <!-- Recent articles -->
      <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Articles récents</span>
          <NuxtLink to="/admin/articles" class="text-xs text-violet-500 hover:text-violet-600 font-medium transition-colors">Voir tout →</NuxtLink>
        </div>
        <div class="flex-1">
          <div v-if="recentArticles.length">
            <div
              v-for="article in recentArticles"
              :key="article.id"
              class="flex items-center gap-3 px-5 py-3 border-b border-gray-50 dark:border-white/[0.03] last:border-0
                     hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
            >
              <div class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ article.title }}</p>
                <p class="text-xs text-gray-400">{{ article.createdAt }} · {{ article.readTime }} min</p>
              </div>
              <span
                class="text-[11px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0"
                :class="article.published
                  ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
                  : 'bg-gray-50 text-gray-400 dark:bg-white/[0.04] dark:text-gray-500'"
              >
                {{ article.published ? 'publié' : 'brouillon' }}
              </span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-12 gap-2">
            <p class="text-sm text-gray-400">Aucun article</p>
            <NuxtLink to="/admin/articles?new=1" class="text-xs text-violet-500 hover:text-violet-600 font-medium transition-colors">+ Écrire le premier</NuxtLink>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
