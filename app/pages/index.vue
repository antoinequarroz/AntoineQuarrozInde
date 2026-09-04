<script setup lang="ts">
import {
  PUBLIC_SEO_IDENTITY,
  resolvePublicSocialImage,
  serializeJsonLd,
} from '~~/shared/utils/publicSeoIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')
const i18n = useI18n()
const { t, locale } = i18n
const translatedList = i18n.tm as unknown as (key: string) => string[]
const localePath = useLocalePath()
const canonicalUrl = computed(() => `${siteUrl}${localePath('/', locale.value)}`)
const socialImage = resolvePublicSocialImage(siteUrl).url
const approvedProfiles = PUBLIC_SEO_IDENTITY.profiles.map(profile => profile.href)
const postalAddress = {
  '@type': 'PostalAddress',
  ...PUBLIC_SEO_IDENTITY.address,
}

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
      innerHTML: serializeJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Person',
            '@id': `${siteUrl}/#person`,
            name: PUBLIC_SEO_IDENTITY.name,
            jobTitle: t('seo.home.job_title'),
            url: canonicalUrl.value,
            image: socialImage,
            email: PUBLIC_SEO_IDENTITY.emailHref,
            telephone: PUBLIC_SEO_IDENTITY.telephone,
            address: postalAddress,
            sameAs: approvedProfiles,
            knowsAbout: translatedList('seo.home.knows_about'),
          },
          {
            '@type': 'ProfessionalService',
            '@id': `${siteUrl}/#business`,
            name: PUBLIC_SEO_IDENTITY.name,
            url: canonicalUrl.value,
            image: socialImage,
            email: PUBLIC_SEO_IDENTITY.emailHref,
            telephone: PUBLIC_SEO_IDENTITY.telephone,
            address: postalAddress,
            areaServed: translatedList('seo.home.areas_served'),
            founder: { '@id': `${siteUrl}/#person` },
            sameAs: approvedProfiles,
          },
          {
            '@type': 'WebSite',
            '@id': `${siteUrl}/#website`,
            url: `${siteUrl}/`,
            name: PUBLIC_SEO_IDENTITY.name,
            inLanguage: ['fr-CH', 'en-US', 'de-CH'],
            publisher: { '@id': `${siteUrl}/#business` },
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
    projectsStore.ensureLoaded(),
    ...(locale.value === 'fr' ? [
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
    <SectionsPortfolioSection />
    <SectionsBlogSection />
    <SectionsReviewsSection />
    <SectionsContactSection />
  </div>
</template>
