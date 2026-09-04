<script setup lang="ts">
import {
  resolvePublicBreadcrumbTrail,
  resolvePublicService,
} from '~~/shared/utils/publicStructuredData'
import { resolvePublicServiceDecisionContent } from '~~/shared/utils/publicServiceContent'
import { serializeJsonLd } from '~~/shared/utils/publicSeoIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')
const decisionContent = resolvePublicServiceDecisionContent({
  introduction: 'J’accompagne les indépendants, les PME et les équipes produit du Valais qui ont besoin d’un site, d’une interface métier ou d’un accompagnement technique, du cadrage à la mise en ligne.',
  deliverables: [
    'Un cadrage du besoin et des priorités fonctionnelles.',
    'Des parcours et une interface adaptés aux personnes qui utiliseront le produit.',
    'Le développement web, le CMS et les intégrations retenues dans le périmètre.',
    'Le déploiement et la transmission des éléments techniques convenus.',
  ],
  process: [
    'Un premier échange clarifie le contexte, les objectifs et les contraintes.',
    'Le périmètre et les priorités sont posés par écrit avant la réalisation.',
    'Le projet avance par étapes courtes avec des validations régulières.',
    'La mise en ligne intervient après les vérifications prévues, puis le suivi convenu commence.',
  ],
  timeline: 'Le planning est confirmé après le cadrage. Il dépend du périmètre, des contenus disponibles, des intégrations et du rythme de vos validations.',
  limits: [
    'Le travail améliore la base technique et l’expérience; les résultats commerciaux et le classement SEO restent variables.',
    'Les contenus, les accès et les validations nécessaires doivent être fournis ou approuvés.',
    'La maintenance et les services tiers sont cadrés séparément selon le mandat.',
  ],
  nextStep: 'Présentez-moi votre contexte et la priorité à résoudre. Je pourrai ensuite proposer un périmètre et un planning adaptés.',
  proofNote: 'Le portfolio rassemble les réalisations actuellement publiées. Les études détaillées ne sont ajoutées qu’après validation de leur contenu.',
  proof: { label: 'Voir les réalisations web et mobile', path: '/#portfolio' },
  contact: { label: 'Présenter mon besoin', path: '/#contact' },
})
const service = Object.freeze({
  name: 'Développeur web en Valais',
  description: decisionContent.introduction,
  path: '/developpeur-web-valais',
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
  title: 'Développeur web en Valais | Antoine Quarroz',
  description: 'Développeur web indépendant en Valais pour sites, CMS et interfaces métier : cadrage, réalisation, mise en ligne et suivi selon le périmètre.',
  ogTitle: 'Développeur web en Valais | Antoine Quarroz',
  ogDescription: 'Sites, interfaces métier et accompagnement technique, du cadrage à la mise en ligne.',
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

const zones = [
  'Sion',
  'Martigny',
  'Sierre',
  'Monthey',
  'Val d’Hérens',
  'Val d’Anniviers',
]
</script>

<template>
  <section class="section-padding section-surface">
    <div class="section-background">
      <div class="section-grid" />
    </div>

    <div class="section-container relative z-10">
      <div class="mx-auto max-w-4xl">
        <UiAppBreadcrumbs :items="breadcrumbs.items" class="mb-6" />
        <span class="badge mb-4">Valais</span>
        <h1 data-service-name class="section-heading">
          {{ service.name }}
        </h1>
        <p data-service-description data-service-introduction data-service-offer data-service-audience data-service-area class="section-subtitle max-w-3xl">
          {{ service.description }}
        </p>

        <div class="mt-8 rounded-2xl border border-violet-500/15 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <h2 class="text-xl font-display font-bold text-gray-900 dark:text-white">
            Zone couverte
          </h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Le service est proposé dans tout le Valais, notamment dans les communes et régions suivantes :
          </p>
          <ul class="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-200 sm:grid-cols-3">
            <li v-for="zone in zones" :key="zone" class="rounded-lg border border-violet-500/10 px-3 py-2 dark:border-white/10">
              {{ zone }}
            </li>
          </ul>
        </div>

        <UiServiceDecisionContent :content="decisionContent" />
      </div>
    </div>
  </section>
</template>
