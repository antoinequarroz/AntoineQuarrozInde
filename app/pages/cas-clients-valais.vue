<script setup lang="ts">
import { projectCaseStudyServiceLabel } from '~~/shared/utils/projectCaseStudyApproval'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')
const localePath = useLocalePath()
const projectsStore = useProjectsStore()

await projectsStore.ensureLoaded()

const publishedCases = computed(() => (
  projectsStore.projects.filter(project => project.caseStudyPublished)
))

function relatedServices(paths: string[]) {
  return paths.flatMap((path) => {
    const label = projectCaseStudyServiceLabel(path)
    return label ? [{ path, label }] : []
  })
}

useSeoMeta({
  title: 'Cas clients | Développeur web en Valais - Antoine Quarroz',
  description: 'Études de cas web en Valais : contexte, rôle, périmètre, décisions et résultats approuvés de projets réalisés par Antoine Quarroz.',
  ogTitle: 'Cas clients web en Valais - Antoine Quarroz',
  ogDescription: 'Projets web et mobile présentés avec leur contexte, le rôle d’Antoine, les décisions prises et les résultats dont la publication a été approuvée.',
  ogUrl: `${siteUrl}/cas-clients-valais`,
  ogType: 'website',
  robots: 'index, follow',
})

useHead({
  link: [
    { rel: 'canonical', href: `${siteUrl}/cas-clients-valais` },
  ],
})
</script>

<template>
  <section class="section-padding section-surface !pt-28 md:!pt-32">
    <div class="section-background">
      <div class="section-grid" />
    </div>

    <div class="section-container relative z-10">
      <div class="mx-auto max-w-5xl">
        <h1 class="section-heading">
          Cas clients web en Valais
        </h1>
        <p class="section-subtitle max-w-3xl">
          Chaque étude publiée distingue le contexte, mon rôle, le périmètre, les décisions prises et les résultats dont la publication a été vérifiée et approuvée.
        </p>

        <div v-if="publishedCases.length" class="mt-10 grid gap-6 md:grid-cols-2">
          <article
            v-for="project in publishedCases"
            :key="project.id"
            class="group overflow-hidden rounded-3xl border border-violet-500/15 bg-white/70 shadow-lg shadow-violet-500/5 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <NuxtLink :to="localePath(`/projets/${project.slug}`)" class="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500">
              <img
                v-if="project.image"
                :src="project.image"
                alt=""
                class="aspect-[16/9] w-full object-cover outline outline-1 -outline-offset-1 outline-black/10 transition-transform duration-150 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none dark:outline-white/10"
                loading="lazy"
                decoding="async"
              >
            </NuxtLink>
            <div class="p-5 sm:p-6">
                <p v-if="project.clientLabel" class="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                  {{ project.clientLabel }}
                </p>
                <h2 :class="project.clientLabel ? 'mt-2' : ''">
                  <NuxtLink :to="localePath(`/projets/${project.slug}`)" class="font-display text-2xl font-bold text-gray-900 transition-colors hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-white dark:hover:text-violet-200">{{ project.title }}</NuxtLink>
                </h2>
                <p class="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                  {{ project.description }}
                </p>
                <div v-if="project.tags.length" class="mt-5 flex flex-wrap gap-2">
                  <span
                    v-for="tag in project.tags"
                    :key="tag"
                    class="rounded-full border border-violet-500/15 px-3 py-1 text-xs text-violet-700 dark:border-violet-400/25 dark:text-violet-200"
                  >
                    {{ tag }}
                  </span>
                </div>
                <div v-if="relatedServices(project.relatedServicePaths).length" class="mt-5 flex flex-wrap gap-2" data-case-study-card-services>
                  <NuxtLink v-for="service in relatedServices(project.relatedServicePaths)" :key="service.path" :to="service.path" class="inline-flex min-h-11 items-center rounded-full border border-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-700 transition-colors hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-200 dark:hover:bg-cyan-500/10">{{ service.label }}</NuxtLink>
                </div>
                <NuxtLink :to="localePath(`/projets/${project.slug}`)" class="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-violet-700 transition-colors hover:text-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200 dark:hover:text-white">
                  Lire l’étude de cas <span class="ml-2" aria-hidden="true">→</span>
                </NuxtLink>
            </div>
          </article>
        </div>

        <div v-else class="mt-10 rounded-3xl border border-violet-500/15 bg-white/70 p-6 text-center dark:border-white/10 dark:bg-white/[0.04] sm:p-10">
          <h2 class="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Les prochaines études arrivent bientôt
          </h2>
          <p class="mx-auto mt-3 max-w-xl leading-relaxed text-gray-600 dark:text-gray-300">
            En attendant leur publication, découvrez les projets déjà présentés dans mon portfolio ou échangeons sur votre besoin.
          </p>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            <NuxtLink :to="localePath('/#portfolio')" class="btn-secondary">Voir le portfolio</NuxtLink>
            <NuxtLink :to="localePath('/#contact')" class="btn-primary">Parler de votre projet</NuxtLink>
          </div>
        </div>

        <div v-if="publishedCases.length" class="mt-8">
          <NuxtLink :to="localePath('/#contact')" class="btn-primary">Parler de votre projet</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
