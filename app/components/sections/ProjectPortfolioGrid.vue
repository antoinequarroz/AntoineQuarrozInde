<script setup lang="ts">
import type { Project } from '~/types'
import { resolveProjectPreview } from '~/utils/projectPreview'
import { getProjectSummary } from '~/utils/projectSummary'
import ProjectPortfolioBadges from './ProjectPortfolioBadges.vue'

const props = defineProps<{ projects: Project[] }>()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { track } = useMarketing()

const entries = computed(() => props.projects.map(project => ({
  project,
  preview: project.image ? resolveProjectPreview(project.image, 'grid') : null,
  summary: getProjectSummary(project, locale.value),
  technologies: [...new Set(project.tags.map(tag => tag.trim()).filter(Boolean))].slice(0, 3),
})))

function trackProject(project: Project) {
  track('project_case_study_click', {
    projectId: project.id,
    slug: project.slug,
    category: project.category,
  })
}
</script>

<template>
  <div>
    <div v-if="!entries.length" class="rounded-2xl border border-violet-500/15 bg-white/70 p-10 text-center text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
      {{ t('portfolio.coming_soon') }}
    </div>

    <div v-else data-project-grid class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
      <article
        v-for="{ project, preview, summary, technologies } in entries"
        :key="project.id"
        data-project-grid-card
        :aria-labelledby="`project-grid-title-${project.id}`"
        class="flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-violet-500/15 bg-white/90 shadow-sm shadow-violet-950/[0.03] dark:border-white/10 dark:bg-[#11111b] dark:shadow-none"
      >
        <div class="relative aspect-[16/10] overflow-hidden bg-violet-50 dark:bg-[#080810]">
          <img
            v-if="preview"
            v-bind="preview"
            :alt="project.title"
            width="800"
            height="500"
            loading="lazy"
            decoding="async"
            class="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
          >
          <div v-else aria-hidden="true" class="flex h-full items-center justify-center font-display text-6xl font-bold text-violet-300 dark:text-violet-400/40">
            {{ project.title.charAt(0) }}
          </div>
        </div>

        <div class="flex flex-1 flex-col p-5 sm:p-6">
          <p class="text-xs font-semibold text-violet-700 dark:text-violet-300">{{ t(`portfolio.${project.category}`) }}</p>
          <h3 :id="`project-grid-title-${project.id}`" class="mt-1.5 break-words font-display text-2xl font-bold leading-tight tracking-tight text-gray-950 dark:text-white">
            {{ project.title }}
          </h3>
          <ProjectPortfolioBadges :project="project" class="mt-3" />

          <p v-if="summary.text" :lang="summary.lang" class="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {{ summary.text }}
          </p>

          <ul v-if="technologies.length" :aria-label="t('portfolio.technologies')" class="mt-4 flex flex-wrap gap-1.5 text-xs leading-4 text-gray-600 dark:text-gray-300">
            <li v-for="technology in technologies" :key="technology" class="max-w-full break-words rounded-lg bg-gray-950/[0.04] px-2.5 py-1 dark:bg-white/[0.06]">
              {{ technology }}
            </li>
          </ul>

          <div class="mt-auto pt-5">
            <NuxtLink
              :to="localePath(`/projets/${project.slug}`)"
              :aria-label="`${t('portfolio.view_details')} : ${project.title}`"
              class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600/10 px-4 py-2 text-sm font-semibold text-violet-800 transition-[color,background-color,transform] duration-150 hover:bg-violet-600/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500 motion-safe:active:scale-[0.96] dark:bg-violet-400/10 dark:text-violet-200 dark:hover:bg-violet-400/20"
              @click="trackProject(project)"
            >
              {{ t('portfolio.view_details') }}
              <svg aria-hidden="true" class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
