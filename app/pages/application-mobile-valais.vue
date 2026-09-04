<script setup lang="ts">
import {
  resolvePublicBreadcrumbTrail,
  resolvePublicService,
} from '~~/shared/utils/publicStructuredData'
import { serializeJsonLd } from '~~/shared/utils/publicSeoIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')
const service = Object.freeze({
  name: "Developpement d'application mobile en Valais",
  description: 'Je developpe des apps mobiles pour besoins metier et parcours client: experience fluide, code maintenable et evolution simple dans le temps.',
  path: '/application-mobile-valais',
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
  title: 'Developpement Application Mobile Valais - Antoine Quarroz',
  description: 'Developpement d application mobile en Valais: UX claire, architecture stable et livraisons rapides.',
  ogTitle: 'Developpement Application Mobile Valais - Antoine Quarroz',
  ogDescription: 'Conception d applications mobiles utiles et performantes pour votre activite.',
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
        <span class="badge mb-4">Mobile</span>
        <h1 data-service-name class="section-heading">{{ service.name }}</h1>
        <p data-service-description class="section-subtitle max-w-3xl">
          {{ service.description }}
        </p>

        <div class="mt-8 grid gap-4 md:grid-cols-3">
          <article class="rounded-2xl border border-violet-500/15 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 class="font-display text-lg font-semibold text-gray-900 dark:text-white">Prototype</h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Flux ecrans, parcours utilisateurs et priorites produit.</p>
          </article>
          <article class="rounded-2xl border border-violet-500/15 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 class="font-display text-lg font-semibold text-gray-900 dark:text-white">Developpement</h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Architecture claire, composants reutilisables, API robustes.</p>
          </article>
          <article class="rounded-2xl border border-violet-500/15 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 class="font-display text-lg font-semibold text-gray-900 dark:text-white">Suivi</h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Corrections, evolutions et optimisation continue.</p>
          </article>
        </div>

        <div class="mt-8"><a href="/#contact" class="btn-primary">Parler de votre app</a></div>
      </div>
    </div>
  </section>
</template>
