<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')

useSeoMeta({
  title: 'Antoine Quarroz — Développeur Web en Valais | Freelance',
  description: 'Développeur web freelance basé en Valais, Antoine Quarroz conçoit des sites, applications mobiles et CMS sur mesure pour des clients en Suisse et à distance dans le monde.',
  ogTitle: 'Antoine Quarroz — Développeur Web en Valais',
  ogDescription: 'Sites web, applications mobiles et CMS sur mesure depuis le Valais, pour la Suisse et à distance dans le monde.',
  ogUrl: `${siteUrl}/`,
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  author: 'Antoine Quarroz',
  twitterTitle: 'Antoine Quarroz — Développeur Web en Valais',
  twitterDescription: 'Freelance web & mobile en Valais, disponible à distance partout dans le monde.',
})

useHead({
  meta: [
    {
      name: 'keywords',
      content: 'Antoine Quarroz, développeur web Valais, développeur web Suisse, freelance web Valais, création site internet Valais, développeur Nuxt Vue',
    },
  ],
  link: [
    { rel: 'canonical', href: `${siteUrl}/` },
    { rel: 'alternate', hreflang: 'fr-CH', href: `${siteUrl}/` },
    { rel: 'alternate', hreflang: 'en-US', href: `${siteUrl}/en` },
    { rel: 'alternate', hreflang: 'de-CH', href: `${siteUrl}/de` },
    { rel: 'alternate', hreflang: 'x-default', href: `${siteUrl}/` },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Person',
            '@id': `${siteUrl}/#person`,
            name: 'Antoine Quarroz',
            jobTitle: 'Développeur web freelance',
            url: `${siteUrl}/`,
            image: `${siteUrl}/about.jpg`,
            email: 'mailto:info@antoinequarroz.ch',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Valais',
              addressCountry: 'CH',
            },
            knowsAbout: ['Développement web', 'Nuxt', 'Vue.js', 'Applications mobiles', 'CMS'],
          },
          {
            '@type': 'ProfessionalService',
            '@id': `${siteUrl}/#business`,
            name: 'Antoine Quarroz',
            url: `${siteUrl}/`,
            image: `${siteUrl}/about.jpg`,
            areaServed: ['Valais', 'Suisse', 'Europe', 'Monde'],
            founder: { '@id': `${siteUrl}/#person` },
            sameAs: [],
          },
          {
            '@type': 'WebSite',
            '@id': `${siteUrl}/#website`,
            url: `${siteUrl}/`,
            name: 'Antoine Quarroz',
            inLanguage: ['fr-CH', 'en-US', 'de-CH'],
          },
        ],
      }),
    },
  ],
})

const projectsStore = useProjectsStore()
const articlesStore = useArticlesStore()
const reviewsStore = useReviewsStore()
const googleReviewsStore = useGoogleReviewsStore()

await useAsyncData('index-data', () =>
  Promise.all([
    projectsStore.ensureLoaded(),
    articlesStore.ensureLoaded(),
    reviewsStore.ensureLoaded(),
    googleReviewsStore.ensureLoaded(),
  ]),
)
</script>

<template>
  <div>
    <SectionsHeroSplineSection />
    <SectionsAboutSection />
    <SectionsServicesSection />
    <SectionsPortfolioSection />
    <SectionsBlogSection />
    <SectionsReviewsSection />
    <SectionsContactSection />
  </div>
</template>
