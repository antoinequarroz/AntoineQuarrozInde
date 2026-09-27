<script setup lang="ts">
import { resolvePublicBreadcrumbTrail } from '~~/shared/utils/publicStructuredData'
import { serializeJsonLd } from '~~/shared/utils/publicSeoIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')
const path = '/ressources/checklist-ia-pme'
const canonicalUrl = `${siteUrl}${path}`
const breadcrumbs = resolvePublicBreadcrumbTrail(siteUrl, [
  { name: 'Accueil', path: '/' },
  { name: 'Checklist pilote IA en PME', path },
])

useSeoMeta({
  title: 'Checklist pilote IA en PME sur 30 jours | Antoine Quarroz',
  description: 'Téléchargez une checklist pratique pour choisir un cas d’usage IA, protéger les données et mesurer un pilote de 30 jours dans une PME suisse.',
  ogTitle: 'Checklist : pilote IA de 30 jours dans une PME',
  ogDescription: 'Cas d’usage, données, outils, validation humaine et mesure avant/après dans un PDF pratique.',
  ogUrl: canonicalUrl,
  robots: 'noindex, follow',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [{
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: 'Checklist pilote IA en PME sur 30 jours',
          description: 'Une checklist pratique destinée aux PME suisses qui souhaitent tester un premier usage de l’intelligence artificielle sans exposer leurs données.',
          url: canonicalUrl,
          inLanguage: 'fr-CH',
        },
        breadcrumbs.jsonLd,
      ],
    }),
  }],
})
</script>

<template>
  <main class="section-surface pb-24 pt-28">
    <div class="section-background"><div class="section-grid" /></div>
    <div class="section-container relative z-10">
      <div class="mx-auto max-w-5xl">
        <UiAppBreadcrumbs :items="breadcrumbs.items" class="mb-7" />
        <div class="relative overflow-hidden rounded-[2rem] border border-violet-400/25 bg-[#080810] p-7 text-white shadow-[0_32px_90px_-48px_rgba(124,58,237,0.8)] sm:p-10 lg:p-12">
          <div class="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-violet-400/30" aria-hidden="true" />
          <div class="pointer-events-none absolute -right-8 -top-12 h-52 w-52 rounded-full border border-cyan-300/20" aria-hidden="true" />
          <div class="relative grid items-end gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
            <div>
              <div class="flex items-center gap-3">
                <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 font-display text-sm font-bold text-white shadow-lg shadow-violet-900/30">AQ</span>
                <span class="rounded-full border border-violet-300/25 bg-violet-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Ressource gratuite pour PME</span>
              </div>
              <h1 class="mt-6 max-w-4xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
              Encadrez votre premier pilote IA avant d’y mettre des données réelles
              </h1>
            </div>
            <p class="text-lg leading-8 text-slate-300">
              Huit pages à compléter pour choisir une tâche, fixer les règles et décider après 30 jours sur des mesures concrètes.
            </p>
          </div>
        </div>

        <BlogLeadMagnetSignup class="mt-12" />

        <section class="mx-auto mt-16 max-w-4xl" aria-labelledby="preview-title">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Aperçu</p>
          <h2 id="preview-title" class="mt-3 font-display text-3xl font-bold text-gray-950 dark:text-white">Ce que vous aurez décidé à la fin</h2>
          <div class="mt-8 grid gap-5 sm:grid-cols-2">
            <article v-for="(item, index) in [
              ['01', 'Le cas d’usage', 'Une tâche fréquente, réversible et assez simple pour être relue.'],
              ['02', 'Les données autorisées', 'Une classification claire avant la première saisie dans l’outil.'],
              ['03', 'Les règles de l’équipe', 'Outils approuvés, validation humaine et procédure en cas d’erreur.'],
              ['04', 'La décision', 'Intégrer, modifier ou abandonner selon les résultats du pilote.'],
            ]" :key="item[0]" class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <span class="font-display text-sm font-bold text-violet-600 dark:text-cyan-300">{{ item[0] }}</span>
              <h3 class="mt-3 font-display text-xl font-bold text-gray-950 dark:text-white">{{ item[1] }}</h3>
              <p class="mt-2 leading-7 text-gray-600 dark:text-gray-300">{{ item[2] }}</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>
