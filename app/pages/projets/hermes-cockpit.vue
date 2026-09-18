<script setup lang="ts">
import { serializeJsonLd } from '~~/shared/utils/publicSeoIdentity'
import { resolvePublicBreadcrumbTrail } from '~~/shared/utils/publicStructuredData'

const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')
const path = '/projets/hermes-cockpit'
const title = 'Hermes Cockpit — piloter des agents IA depuis un Mac'
const description = 'Un cockpit macOS pour organiser les profils, projets, missions et validations de Hermes Agent, avec un premier compagnon web privé en lecture seule sur iPhone.'
const breadcrumbs = resolvePublicBreadcrumbTrail(siteUrl, [
  { name: 'Accueil', path: '/' },
  { name: 'Hermes Cockpit', path },
])

useSeoMeta({
  title: `${title} | Antoine Quarroz`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: `${siteUrl}${path}`,
  ogType: 'article',
  robots: 'index, follow',
})
useHead({
  link: [{ rel: 'canonical', href: `${siteUrl}${path}` }],
  script: [{
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CreativeWork',
          name: 'Hermes Cockpit',
          description,
          url: `${siteUrl}${path}`,
          creator: { '@type': 'Person', name: 'Antoine Quarroz', url: siteUrl },
        },
        breadcrumbs.jsonLd,
      ],
    }),
  }],
})

const macFeatures = [
  { title: 'Une vue par projet', text: 'Les missions, conversations et rapports sont regroupés dans des espaces nommés pour retrouver rapidement le contexte.' },
  { title: 'Six profils spécialisés', text: 'JARVIS coordonne ; FRIDAY, VISION, ORACLE, TESS et ULTRON prennent en charge leurs domaines respectifs.' },
  { title: 'Des résultats à relire', text: 'Les rapports remontent dans une file de validation. Les décisions et corrections restent visibles dans le cockpit.' },
  { title: 'Le modèle adapté à la tâche', text: 'Le choix du modèle est ajustable par profil et par mission, avec les limites des fournisseurs affichées lorsqu’elles sont connues.' },
]
</script>

<template>
  <main class="overflow-hidden pb-24 pt-24 md:pt-28">
    <section class="relative border-b border-violet-500/10 pb-16 pt-8 dark:border-white/10 md:pb-24 md:pt-14">
      <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.2),transparent_38%),radial-gradient(circle_at_85%_65%,rgba(34,211,238,0.12),transparent_35%)]" />
      <div class="section-container">
        <UiAppBreadcrumbs :items="breadcrumbs.items" class="mb-5" />
        <NuxtLink to="/#portfolio" class="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-500 dark:text-violet-200 dark:hover:text-white">
          <span aria-hidden="true">←</span> Retour aux projets
        </NuxtLink>

        <div class="mt-8 grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <div class="flex flex-wrap gap-2">
              <span class="badge">Projet personnel</span>
              <span class="badge">Application macOS disponible</span>
            </div>
            <h1 class="mt-7 max-w-3xl font-display text-5xl font-bold leading-[1.05] text-gray-950 dark:text-white sm:text-6xl lg:text-7xl">Hermes Cockpit, un poste de pilotage pour mes agents IA.</h1>
            <p class="mt-7 max-w-xl text-lg leading-relaxed text-gray-700 dark:text-gray-300">Hermes Cockpit rassemble les projets, profils, missions et décisions qui accompagnent mon activité. Le Mac sert de centre de travail ; un premier compagnon web privé permet de suivre l’essentiel sur iPhone.</p>
          </div>

          <div class="relative mx-auto w-full max-w-2xl" aria-label="Représentation illustrative du cockpit sur Mac">
            <div class="rounded-[1.5rem] border border-violet-400/25 bg-[#11101d] p-2 shadow-[0_35px_100px_rgba(36,16,86,0.3)] sm:p-3">
              <div class="overflow-hidden rounded-xl border border-white/10 bg-[#181629]">
                <div class="flex h-9 items-center gap-2 border-b border-white/10 px-4"><span class="h-2.5 w-2.5 rounded-full bg-[#ff605c]" /><span class="h-2.5 w-2.5 rounded-full bg-[#ffbd44]" /><span class="h-2.5 w-2.5 rounded-full bg-[#00ca4e]" /><span class="ml-auto text-[10px] font-semibold tracking-[0.18em] text-white/40">HERMES COCKPIT</span></div>
                <div class="grid min-h-64 grid-cols-[6rem_1fr] sm:min-h-80 sm:grid-cols-[10rem_1fr]">
                  <div class="space-y-3 border-r border-white/10 p-3 sm:p-5"><div class="text-xs font-bold text-violet-300">AQ / HERMES</div><div class="rounded-lg bg-violet-500/20 px-2 py-2 text-xs text-white">Vue d’ensemble</div><div class="px-2 text-xs text-white/60">Projets</div><div class="px-2 text-xs text-white/60">Profils</div><div class="px-2 text-xs text-white/60">Validations</div></div>
                  <div class="space-y-4 p-4 sm:p-6"><div class="flex items-center justify-between gap-2"><div><div class="text-[10px] uppercase tracking-widest text-cyan-300">Espace de travail</div><div class="mt-1 font-display text-xl font-bold text-white sm:text-2xl">Vue d’ensemble</div></div><div class="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400" /></div><div class="grid grid-cols-2 gap-2 sm:gap-3"><div class="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white"><div class="text-xs text-white/50">Profils</div><div class="mt-2 font-display text-2xl font-bold">06</div></div><div class="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white"><div class="text-xs text-white/50">À relire</div><div class="mt-2 font-display text-2xl font-bold">↗</div></div></div><div class="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3"><div class="text-xs font-bold text-violet-200">Coordination</div><div class="mt-2 flex flex-wrap gap-1.5"><span v-for="name in ['JARVIS', 'FRIDAY', 'VISION', 'ORACLE']" :key="name" class="rounded-md bg-white/10 px-2 py-1 text-[10px] text-white/70">{{ name }}</span></div></div></div>
                </div>
              </div>
            </div>
            <p class="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">Aperçu illustratif — aucune donnée client affichée.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section-container py-16 md:py-24">
      <div class="max-w-3xl"><span class="badge">Sur Mac aujourd’hui</span><h2 class="mt-5 font-display text-3xl font-bold text-gray-950 dark:text-white md:text-5xl">À propos du projet : du travail réparti, une lecture claire.</h2><p class="mt-5 text-lg leading-relaxed text-gray-700 dark:text-gray-300">J’ai construit cette application pour suivre concrètement ce que chaque agent fait pour mon activité, retrouver ses résultats et garder la main sur les validations.</p></div>
      <div class="mt-10 grid gap-4 md:grid-cols-2"><article v-for="feature in macFeatures" :key="feature.title" class="rounded-3xl border border-violet-500/15 bg-white/75 p-7 shadow-lg shadow-violet-500/5 dark:border-white/10 dark:bg-white/[0.04]"><h3 class="font-display text-xl font-bold text-gray-950 dark:text-white">{{ feature.title }}</h3><p class="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">{{ feature.text }}</p></article></div>
    </section>

    <section class="border-y border-violet-500/10 bg-violet-500/[0.04] py-16 dark:border-white/10 dark:bg-violet-400/[0.05] md:py-24">
      <div class="section-container grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)]">
        <div><span class="badge">Compagnon web iPhone · lecture seule</span><h2 class="mt-5 font-display text-3xl font-bold text-gray-950 dark:text-white md:text-5xl">L’essentiel, même loin du Mac.</h2><p class="mt-6 max-w-2xl text-lg leading-relaxed text-gray-700 dark:text-gray-300">Une page privée adaptée au téléphone reçoit les projets, profils, missions et états de relecture partagés par le Mac. Elle affiche la date du relevé pour que l’on sache si les informations sont encore fraîches. Les validations des résultats du cockpit restent sur le Mac pendant que leur synchronisation sécurisée est développée.</p><p class="mt-5 text-sm font-semibold text-violet-700 dark:text-violet-200">L’application native iPhone et les validations mobiles restent à venir.</p></div>
        <div class="mx-auto w-64 rounded-[2.5rem] border-[7px] border-[#191629] bg-[#191629] p-1 shadow-[0_30px_75px_rgba(36,16,86,0.28)]" aria-label="Concept illustratif du compagnon iPhone"><div class="min-h-[25rem] rounded-[1.8rem] bg-[#211d36] p-5"><div class="mx-auto mb-8 h-4 w-20 rounded-full bg-[#0e0c17]" /><div class="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">HERMES COCKPIT</div><div class="mt-2 font-display text-2xl font-bold text-white">À suivre</div><div class="mt-6 space-y-3"><div v-for="item in ['Projets', 'Rapports à relire', 'Profils']" :key="item" class="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm font-semibold text-white">{{ item }} <span class="float-right text-violet-300">→</span></div></div><div class="mt-8 text-xs text-white/45">Concept d’interface · données fictives</div></div></div>
      </div>
    </section>

    <section class="section-container py-16 md:py-24"><div class="max-w-3xl"><span class="badge">Mon rôle</span><h2 class="mt-5 font-display text-3xl font-bold text-gray-950 dark:text-white md:text-5xl">Concevoir un outil que j’utilise vraiment.</h2><p class="mt-6 text-lg leading-relaxed text-gray-700 dark:text-gray-300">J’ai défini les parcours, la structure par projet, les contrôles de validation et l’identité visuelle, puis développé l’application macOS et ses connexions à Hermes. Le compagnon mobile est la suite de ce travail : il sera montré ici selon son avancement réel.</p><NuxtLink to="/#contact" class="mt-8 inline-flex min-h-11 items-center rounded-2xl bg-gradient-brand px-6 py-3 font-semibold text-white shadow-glow-sm transition-opacity hover:opacity-90">Parler d’un projet similaire <span class="ml-2" aria-hidden="true">→</span></NuxtLink></div></section>
  </main>
</template>
