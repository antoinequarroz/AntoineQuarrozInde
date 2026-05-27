<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')

useSeoMeta({
  title: 'Creation Site Internet Valais - Antoine Quarroz',
  description: 'Creation de site internet en Valais pour independants, PME et startups. Site vitrine rapide, moderne et optimise SEO.',
  ogTitle: 'Creation Site Internet Valais - Antoine Quarroz',
  ogDescription: 'Conception de sites web orientés clarté, conversion et performance.',
  ogUrl: `${siteUrl}/creation-site-internet-valais`,
  robots: 'index, follow',
})

useHead({
  link: [
    { rel: 'canonical', href: `${siteUrl}/creation-site-internet-valais` },
  ],
})
</script>

<template>
  <section class="section-padding section-surface">
    <div class="section-background"><div class="section-grid" /></div>
    <div class="section-container relative z-10">
      <div class="mx-auto max-w-4xl">
        <span class="badge mb-4">Service</span>
        <h1 class="section-heading">Creation de site internet en Valais</h1>
        <p class="section-subtitle max-w-3xl">
          Je conçois des sites web sur mesure pour entreprises valaisannes: structure claire, design propre,
          performances techniques solides et optimisation SEO locale.
        </p>

        <div class="mt-8 grid gap-4 md:grid-cols-3">
          <article class="rounded-2xl border border-violet-500/15 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 class="font-display text-lg font-semibold text-gray-900 dark:text-white">Cadrage</h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Objectifs, cibles, message principal et architecture des pages.</p>
          </article>
          <article class="rounded-2xl border border-violet-500/15 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 class="font-display text-lg font-semibold text-gray-900 dark:text-white">Design & contenu</h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Interface lisible, crédible et orientée prise de contact.</p>
          </article>
          <article class="rounded-2xl border border-violet-500/15 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 class="font-display text-lg font-semibold text-gray-900 dark:text-white">Mise en ligne</h2>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Déploiement fiable, suivi technique et base SEO propre.</p>
          </article>
        </div>

        <div class="mt-8"><a href="/#contact" class="btn-primary">Lancer votre site</a></div>
      </div>
    </div>
  </section>
</template>
