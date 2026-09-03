<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')
const i18n = useI18n()
const { t, locale } = i18n
const translatedList = i18n.tm as unknown as (key: string) => string[]
const localePath = useLocalePath()
const canonicalUrl = computed(() => `${siteUrl}${localePath('/', locale.value)}`)

useSeoMeta({
  title: () => t('seo.home.title'),
  description: () => t('seo.home.description'),
  ogTitle: () => t('seo.home.title'),
  ogDescription: () => t('seo.home.description'),
  ogUrl: () => canonicalUrl.value,
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  author: 'Antoine Quarroz',
  twitterTitle: () => t('seo.home.title'),
  twitterDescription: () => t('seo.home.description'),
})

useHead(() => ({
  link: [
    { rel: 'canonical', href: canonicalUrl.value },
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
            jobTitle: t('seo.home.job_title'),
            url: canonicalUrl.value,
            image: `${siteUrl}/about.jpg`,
            email: 'mailto:info@antoinequarroz.ch',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Valais',
              addressCountry: 'CH',
            },
            knowsAbout: translatedList('seo.home.knows_about'),
          },
          {
            '@type': 'ProfessionalService',
            '@id': `${siteUrl}/#business`,
            name: 'Antoine Quarroz',
            url: canonicalUrl.value,
            image: `${siteUrl}/about.jpg`,
            areaServed: translatedList('seo.home.areas_served'),
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
}))

const projectsStore = useProjectsStore()
const articlesStore = useArticlesStore()
const reviewsStore = useReviewsStore()
const googleReviewsStore = useGoogleReviewsStore()

await useAsyncData(`index-data-${locale.value}`, () =>
  Promise.all([
    googleReviewsStore.ensureLoaded(),
    ...(locale.value === 'fr' ? [
      projectsStore.ensureLoaded(),
      articlesStore.ensureLoaded(),
      reviewsStore.ensureLoaded(),
    ] : []),
  ]),
)
</script>

<template>
  <div>
    <SectionsHeroSplineSection />
    <SectionsAboutSection />
    <SectionsServicesSection />
    <SectionsPortfolioSection v-if="locale === 'fr'" />
    <SectionsBlogSection />
    <SectionsReviewsSection />
    <SectionsContactSection />
  </div>
</template>
