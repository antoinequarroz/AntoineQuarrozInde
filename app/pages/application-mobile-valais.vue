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
  introduction: 'Je conçois avec les entreprises et les équipes produit du Valais des applications mobiles iOS et Android adaptées à un usage métier ou à un parcours client.',
  deliverables: [
    'Un cadrage des usages, des publics et des fonctionnalités prioritaires.',
    'Des parcours et un prototype pour valider l’expérience avant la réalisation complète.',
    'Le développement mobile et la connexion aux API retenues dans le périmètre.',
    'Les tests, la préparation de la distribution et la transmission des éléments convenus.',
  ],
  process: [
    'Le besoin est ramené à un usage prioritaire et à des parcours observables.',
    'Le prototype permet de valider la navigation et les écrans essentiels.',
    'Le développement et les tests avancent progressivement avec vos retours.',
    'La distribution est préparée avec les comptes disponibles, puis le suivi convenu commence.',
  ],
  timeline: 'Le planning est confirmé après le cadrage. Il dépend des plateformes visées, des fonctionnalités, du backend et des API, des comptes de publication, des retours et de la validation des stores.',
  limits: [
    'Les stores et les services tiers conservent leurs propres règles et délais de validation.',
    'Les accès aux comptes, API et données nécessaires doivent être disponibles.',
    'L’adoption de l’application et ses effets métier restent variables après la publication.',
  ],
  nextStep: 'Décrivez l’usage principal, les personnes concernées et les systèmes auxquels l’application doit se connecter. Je pourrai ensuite cadrer un premier périmètre.',
  proofNote: 'Le portfolio présente les réalisations mobiles actuellement publiées. Les études détaillées ne sont ajoutées qu’après validation de leur contenu.',
  proof: { label: 'Voir les réalisations mobiles du portfolio', path: '/#portfolio' },
  contact: { label: 'Présenter mon projet mobile', path: '/#contact' },
})
const service = Object.freeze({
  name: 'Développement d’application mobile en Valais',
  description: decisionContent.introduction,
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
  title: 'Développement d’application mobile en Valais | Antoine Quarroz',
  description: 'Développement d’applications mobiles iOS et Android en Valais : cadrage des usages, prototype, réalisation, tests et préparation de la distribution.',
  ogTitle: 'Développement d’application mobile en Valais | Antoine Quarroz',
  ogDescription: 'Applications mobiles adaptées à un usage métier ou à un parcours client.',
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
        <p data-service-description data-service-introduction data-service-offer data-service-audience data-service-area class="section-subtitle max-w-3xl">
          {{ service.description }}
        </p>

        <UiServiceDecisionContent :content="decisionContent" />
      </div>
    </div>
  </section>
</template>
