<script setup lang="ts">
useSeoMeta({
  title: 'Antoine Quarroz — Développeur Web & Mobile Freelance',
  description: 'Antoine Quarroz, développeur web & mobile freelance basé en Valais, Suisse. Sites vitrine, applications iOS & Android, solutions CMS sur mesure.',
  ogTitle: 'Antoine Quarroz — Développeur Web & Mobile Freelance',
  ogDescription: 'Des expériences digitales qui marquent. Sites vitrine, applications mobiles et CMS sur mesure.',
})

const projectsStore = useProjectsStore()
const articlesStore = useArticlesStore()
const reviewsStore = useReviewsStore()

await useAsyncData('index-data', () =>
  Promise.all([
    projectsStore.ensureLoaded(),
    articlesStore.ensureLoaded(),
    reviewsStore.ensureLoaded(),
  ]),
)
</script>

<template>
  <div>
    <SectionsHeroSplineSection />
    <SectionsStorySection />
    <SectionsAboutSection />
    <SectionsServicesSection />
    <SectionsPortfolioSection />
    <SectionsBlogSection />
    <SectionsReviewsSection />
    <SectionsContactSection />
  </div>
</template>
