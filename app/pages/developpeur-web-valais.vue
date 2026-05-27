<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')

useSeoMeta({
  title: 'Developpeur Web Valais - Antoine Quarroz',
  description: "Developpeur web freelance en Valais. J'accompagne independants, PME et startups pour la creation de sites performants, rapides et orientés conversion.",
  ogTitle: 'Developpeur Web Valais - Antoine Quarroz',
  ogDescription: "Creation de site internet en Valais, refonte et accompagnement digital.",
  ogUrl: `${siteUrl}/developpeur-web-valais`,
  robots: 'index, follow',
})

useHead({
  link: [
    { rel: 'canonical', href: `${siteUrl}/developpeur-web-valais` },
  ],
})

const zones = [
  'Sion',
  'Martigny',
  'Sierre',
  'Monthey',
  "Val d'Herens",
  "Val d'Anniviers",
]
</script>

<template>
  <section class="section-padding section-surface">
    <div class="section-background">
      <div class="section-grid" />
    </div>

    <div class="section-container relative z-10">
      <div class="mx-auto max-w-4xl">
        <span class="badge mb-4">Valais</span>
        <h1 class="section-heading">
          Developpeur web en Valais
        </h1>
        <p class="section-subtitle max-w-3xl">
          Je suis Antoine Quarroz, developpeur web freelance base en Valais. Je conçois des sites vitrine, des interfaces
          CMS et des experiences digitales rapides, claires et orientées resultats.
        </p>

        <div class="mt-8 rounded-2xl border border-violet-500/15 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <h2 class="text-xl font-display font-bold text-gray-900 dark:text-white">
            Zones d'intervention
          </h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            J'accompagne des clients dans tout le Valais, notamment dans les communes et regions suivantes:
          </p>
          <ul class="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-200 sm:grid-cols-3">
            <li v-for="zone in zones" :key="zone" class="rounded-lg border border-violet-500/10 px-3 py-2 dark:border-white/10">
              {{ zone }}
            </li>
          </ul>
        </div>

        <div class="mt-8 grid gap-4 md:grid-cols-3">
          <article class="rounded-2xl border border-violet-500/15 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <h3 class="font-display text-lg font-semibold text-gray-900 dark:text-white">Creation de site web</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Site vitrine performant, responsive et optimisé SEO.</p>
          </article>
          <article class="rounded-2xl border border-violet-500/15 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <h3 class="font-display text-lg font-semibold text-gray-900 dark:text-white">Refonte et optimisation</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Amelioration UX, vitesse, structure SEO et conversion.</p>
          </article>
          <article class="rounded-2xl border border-violet-500/15 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <h3 class="font-display text-lg font-semibold text-gray-900 dark:text-white">Accompagnement</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Conseil technique, architecture et suivi evolutif.</p>
          </article>
        </div>

        <div class="mt-8">
          <a href="/#contact" class="btn-primary">Discuter de votre projet</a>
        </div>
      </div>
    </div>
  </section>
</template>
