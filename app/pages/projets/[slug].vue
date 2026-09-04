<script setup lang="ts">
import {
  PUBLIC_SEO_IDENTITY,
  resolvePublicSocialImage,
  serializeJsonLd,
} from '~~/shared/utils/publicSeoIdentity'
import { resolvePublicBreadcrumbTrail } from '~~/shared/utils/publicStructuredData'
import { projectCaseStudyServiceLabel } from '~~/shared/utils/projectCaseStudyApproval'

const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { track } = useMarketing()
const store = useProjectsStore()
const runtimeConfig = useRuntimeConfig()
const siteUrl = String(runtimeConfig.public.siteUrl).replace(/\/+$/, '')

await store.ensureLoaded()

const project = computed(() => store.projects.find(item => (
  item.slug === route.params.slug && item.caseStudyPublished
)))

if (!project.value) {
  throw createError({ statusCode: 404, message: t('case_study.not_found') })
}

onMounted(() => {
  if (project.value) {
    track('project_case_study_view', { projectId: project.value.id, slug: project.value.slug, category: project.value.category })
  }
})

const breadcrumbs = computed(() => resolvePublicBreadcrumbTrail(siteUrl, [
  { name: 'Accueil', path: '/' },
  { name: 'Cas clients', path: '/cas-clients-valais' },
  { name: project.value!.title, path: `/projets/${encodeURIComponent(project.value!.slug)}` },
]))
const canonicalUrl = computed(() => breadcrumbs.value.items.at(-1)!.url)
const pageTitle = computed(() => project.value?.seoTitle || `${project.value?.title} — Antoine Quarroz`)
const pageDescription = computed(() => project.value?.seoDescription || project.value?.description)
const socialImage = computed(() => resolvePublicSocialImage(siteUrl, project.value?.image))
const socialImageAlt = computed(() => socialImage.value.isFallback
  ? t('seo.social.default_image_alt')
  : t('seo.social.project_image_alt', { title: project.value?.title ?? '' }))
const completedDate = computed(() => {
  if (!project.value?.completedAt) return ''
  return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' })
    .format(new Date(`${project.value.completedAt}T12:00:00`))
})

const storySections = computed(() => [
  { key: 'context', title: 'Contexte', content: project.value?.challenge },
  { key: 'role', title: 'Rôle d’Antoine', content: project.value?.projectRole },
  { key: 'scope', title: 'Périmètre', content: project.value?.projectScope },
  { key: 'decisions', title: 'Décisions', content: project.value?.keyDecisions },
  { key: 'results', title: 'Résultats', content: project.value?.outcome },
].filter(section => section.content))
const supplementarySections = computed(() => [
  { key: 'approach', title: t('case_study.approach'), content: project.value?.approach },
  { key: 'solution', title: t('case_study.solution'), content: project.value?.solution },
].filter(section => section.content))
const relatedServices = computed(() => (project.value?.relatedServicePaths ?? []).flatMap(path => {
  const label = projectCaseStudyServiceLabel(path)
  return label ? [{ path, label }] : []
}))

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage: () => socialImage.value.url,
  ogImageAlt: () => socialImageAlt.value,
  ogUrl: canonicalUrl,
  ogType: 'article',
  robots: 'index, follow',
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: () => socialImage.value.url,
  twitterImageAlt: () => socialImageAlt.value,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: [{
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CreativeWork',
          name: project.value?.title,
          description: pageDescription.value,
          image: socialImage.value.url,
          url: canonicalUrl.value,
          creator: { '@id': `${siteUrl}/#person`, '@type': 'Person', name: PUBLIC_SEO_IDENTITY.name, url: siteUrl },
          dateCreated: project.value?.completedAt || project.value?.createdAt,
          keywords: project.value?.tags.join(', '),
        },
        breadcrumbs.value.jsonLd,
      ],
    }),
  }],
}))
</script>

<template>
  <main v-if="project" class="overflow-hidden pb-24 pt-24 md:pt-28">
    <section class="relative border-b border-violet-500/10 pb-16 pt-8 dark:border-white/10 md:pb-24 md:pt-14">
      <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(124,58,237,0.17),transparent_34%),radial-gradient(circle_at_82%_24%,rgba(34,211,238,0.12),transparent_30%)]" />
      <div class="section-container">
        <UiAppBreadcrumbs :items="breadcrumbs.items" class="mb-4" />
        <NuxtLink :to="localePath('/#portfolio')" class="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-violet-700 transition-colors hover:text-violet-500 dark:text-violet-200 dark:hover:text-white">
          <span aria-hidden="true">←</span>
          {{ t('case_study.back') }}
        </NuxtLink>

        <div class="mt-8 grid items-end gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.55fr)]">
          <div>
            <div class="flex flex-wrap gap-2">
              <span class="badge">{{ t(`portfolio.${project.category}`) }}</span>
              <span v-if="project.clientLabel" class="badge">{{ project.clientLabel }}</span>
            </div>
            <h1 class="mt-6 max-w-4xl font-display text-4xl font-bold leading-[1.04] text-gray-950 dark:text-white sm:text-6xl lg:text-7xl">
              {{ project.title }}
            </h1>
            <p class="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-300 md:text-xl">
              {{ project.description }}
            </p>
          </div>

          <dl class="grid grid-cols-2 gap-x-6 gap-y-5 rounded-3xl border border-violet-500/15 bg-white/75 p-6 shadow-xl shadow-violet-500/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
            <div v-if="project.projectRole">
              <dt class="text-xs font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">{{ t('case_study.role') }}</dt>
              <dd class="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{{ project.projectRole }}</dd>
            </div>
            <div v-if="project.projectDuration">
              <dt class="text-xs font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">{{ t('case_study.duration') }}</dt>
              <dd class="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{{ project.projectDuration }}</dd>
            </div>
            <div v-if="completedDate">
              <dt class="text-xs font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">{{ t('case_study.delivered') }}</dt>
              <dd class="mt-2 text-sm font-semibold capitalize text-gray-900 dark:text-white">{{ completedDate }}</dd>
            </div>
            <div v-if="project.tags.length">
              <dt class="text-xs font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">{{ t('case_study.stack') }}</dt>
              <dd class="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{{ project.tags.slice(0, 4).join(', ') }}</dd>
            </div>
          </dl>
        </div>

        <div class="mt-12 overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-[#10101b] shadow-2xl shadow-violet-500/15 md:mt-16 md:rounded-[2.5rem]">
          <img v-if="project.image" :src="project.image" :alt="project.title" class="aspect-[16/9] w-full object-cover" fetchpriority="high">
          <div v-else class="aspect-[16/9] bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.5),transparent_36%),radial-gradient(circle_at_72%_72%,rgba(34,211,238,0.32),transparent_34%)]" />
        </div>
      </div>
    </section>

    <section class="section-container py-16 md:py-24">
      <div class="mx-auto max-w-5xl space-y-16 md:space-y-24">
        <article v-for="(section, index) in storySections" :key="section.key" :data-case-study-section="section.key" class="grid gap-5 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <div>
            <span class="font-display text-sm text-violet-500/70">{{ String(index + 1).padStart(2, '0') }}</span>
            <h2 class="mt-2 font-display text-2xl font-bold text-gray-950 dark:text-white md:text-3xl">{{ section.title }}</h2>
          </div>
          <p class="whitespace-pre-line text-lg leading-8 text-gray-600 dark:text-gray-300">{{ section.content }}</p>
        </article>
        <article v-for="section in supplementarySections" :key="section.key" class="grid gap-5 border-t border-violet-500/10 pt-12 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white md:text-3xl">{{ section.title }}</h2>
          <p class="whitespace-pre-line text-lg leading-8 text-gray-600 dark:text-gray-300">{{ section.content }}</p>
        </article>
      </div>
    </section>

    <section v-if="project.results.length" class="section-container pb-16 md:pb-20" data-case-study-measures>
      <h2 class="text-center font-display text-2xl font-bold text-gray-950 dark:text-white">{{ t('case_study.verified_results') }}</h2>
      <dl class="mx-auto mt-7 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="result in project.results" :key="`${result.value}-${result.label}`" class="rounded-3xl border border-violet-500/15 bg-white/70 p-6 text-center dark:border-white/10 dark:bg-white/[0.04]">
          <dt class="font-display text-3xl font-bold text-violet-700 dark:text-violet-200 md:text-4xl">{{ result.value }}</dt>
          <dd class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{{ result.label }}</dd>
          <dd v-if="result.measurementContext" class="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ result.measurementContext }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="project.deliverables.length || project.tags.length" class="border-y border-violet-500/10 bg-violet-50/55 py-16 dark:border-white/10 dark:bg-white/[0.025] md:py-20">
      <div class="section-container grid gap-10 md:grid-cols-2 md:gap-16">
        <div v-if="project.deliverables.length">
          <h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ t('case_study.deliverables') }}</h2>
          <ul class="mt-6 space-y-3">
            <li v-for="item in project.deliverables" :key="item" class="flex gap-3 text-gray-600 dark:text-gray-300"><span class="mt-2 h-2 w-2 shrink-0 rounded-full border-2 border-cyan-500" />{{ item }}</li>
          </ul>
        </div>
        <div v-if="project.tags.length">
          <h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ t('case_study.technologies') }}</h2>
          <div class="mt-6 flex flex-wrap gap-2">
            <span v-for="tag in project.tags" :key="tag" class="rounded-full border border-violet-500/15 bg-white/70 px-4 py-2 text-sm font-semibold text-violet-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-violet-100">{{ tag }}</span>
          </div>
        </div>
      </div>
    </section>

    <section v-if="relatedServices.length" class="section-container py-16 md:py-20" data-case-study-services>
      <div class="rounded-3xl border border-violet-500/15 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
        <h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">Services liés à ce projet</h2>
        <p class="mt-3 max-w-2xl leading-relaxed text-gray-600 dark:text-gray-300">Découvrez les services correspondant au périmètre réellement présenté dans cette étude.</p>
        <div class="mt-5 flex flex-wrap gap-3">
          <NuxtLink v-for="service in relatedServices" :key="service.path" :to="service.path" class="btn-secondary">{{ service.label }}</NuxtLink>
        </div>
      </div>
    </section>

    <section v-if="project.galleryImages.length" class="section-container py-16 md:py-24">
      <h2 class="font-display text-3xl font-bold text-gray-950 dark:text-white">{{ t('case_study.gallery') }}</h2>
      <div class="mt-8 grid gap-5 md:grid-cols-2">
        <img v-for="(image, index) in project.galleryImages" :key="image" :src="image" :alt="`${project.title} — ${t('case_study.gallery_image', { number: index + 1 })}`" class="aspect-[4/3] w-full rounded-3xl border border-violet-500/10 object-cover dark:border-white/10" loading="lazy" decoding="async">
      </div>
    </section>

    <section class="section-container pt-10">
      <div class="relative overflow-hidden rounded-[2rem] border border-violet-500/20 bg-[#11101d] px-6 py-12 text-center shadow-2xl shadow-violet-500/15 sm:px-10 md:py-16">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,0.34),transparent_38%),radial-gradient(circle_at_86%_100%,rgba(34,211,238,0.19),transparent_35%)]" />
        <div class="relative mx-auto max-w-2xl">
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">{{ t('case_study.next_project') }}</p>
          <h2 class="mt-4 font-display text-3xl font-bold text-white md:text-4xl">{{ t('case_study.cta_title') }}</h2>
          <p class="mt-4 leading-relaxed text-white/70">{{ t('case_study.cta_text') }}</p>
          <div class="mt-7 flex flex-wrap justify-center gap-3">
            <NuxtLink :to="localePath('/#contact')" class="btn-primary">{{ t('case_study.cta_button') }}</NuxtLink>
            <a v-if="project.caseStudyLiveUrl" :href="project.caseStudyLiveUrl" target="_blank" rel="noopener noreferrer" class="btn-secondary border-white/15 bg-white/5 text-white hover:bg-white/10">{{ t('case_study.view_live') }}</a>
            <a v-if="project.caseStudyCodeUrl" :href="project.caseStudyCodeUrl" target="_blank" rel="noopener noreferrer" class="btn-secondary border-white/15 bg-white/5 text-white hover:bg-white/10">{{ t('case_study.view_code') }}</a>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
