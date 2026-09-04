<script setup lang="ts">
import {
  resolvePublicBreadcrumbTrail,
  resolvePublicService,
} from '~~/shared/utils/publicStructuredData'
import { serializeJsonLd } from '~~/shared/utils/publicSeoIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')
const service = Object.freeze({
  name: 'Refonte de site web en Valais',
  description: 'Votre site est lent, peu lisible ou ne convertit pas. Je vous aide a le moderniser avec une approche orientée resultat: UX, performance, SEO et maintenance.',
  path: '/refonte-site-web-valais',
  areaServed: 'Valais',
})
const breadcrumbs = resolvePublicBreadcrumbTrail(siteUrl, [
  { name: 'Accueil', path: '/' },
  { name: service.name, path: service.path },
])
const canonicalUrl = breadcrumbs.items.at(-1)!.url
const serviceJsonLd = resolvePublicService(siteUrl, {
  ...service,
  serviceType: service.name,
})

useSeoMeta({
  title: 'Refonte Site Web Valais - Antoine Quarroz',
  description: 'Refonte de site web en Valais. Amelioration UX, vitesse, structure SEO et taux de conversion.',
  ogTitle: 'Refonte Site Web Valais - Antoine Quarroz',
  ogDescription: 'Modernisation de votre site existant pour gagner en clarté et performance.',
  ogUrl: canonicalUrl,
  robots: 'index, follow',
})

useHead({
  link: [
    { rel: 'canonical', href: canonicalUrl },
  ],
  script: [{
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({
      '@context': 'https://schema.org',
      '@graph': [serviceJsonLd, breadcrumbs.jsonLd],
    }),
  }],
})
</script>

<template>
  <section class="section-padding section-surface">
    <div class="section-background"><div class="section-grid" /></div>
    <div class="section-container relative z-10">
      <div class="mx-auto max-w-4xl">
        <UiAppBreadcrumbs :items="breadcrumbs.items" class="mb-6" />
        <span class="badge mb-4">Refonte</span>
        <h1 data-service-name class="section-heading">{{ service.name }}</h1>
        <p data-service-description class="section-subtitle max-w-3xl">
          {{ service.description }}
        </p>

        <div class="mt-8 rounded-2xl border border-violet-500/15 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <h2 class="font-display text-xl font-bold text-gray-900 dark:text-white">Ce qui change apres la refonte</h2>
          <ul class="mt-4 grid gap-2 text-sm text-gray-700 dark:text-gray-200 sm:grid-cols-2">
            <li class="rounded-lg border border-violet-500/10 px-3 py-2 dark:border-white/10">Navigation plus simple</li>
            <li class="rounded-lg border border-violet-500/10 px-3 py-2 dark:border-white/10">Temps de chargement reduit</li>
            <li class="rounded-lg border border-violet-500/10 px-3 py-2 dark:border-white/10">Structure SEO propre</li>
            <li class="rounded-lg border border-violet-500/10 px-3 py-2 dark:border-white/10">Pages orientées conversion</li>
          </ul>
        </div>

        <div class="mt-8"><a href="/#contact" class="btn-primary">Demander un audit</a></div>
      </div>
    </div>
  </section>
</template>
