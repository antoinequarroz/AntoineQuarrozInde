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
  introduction: 'J’aide les indépendants et les PME du Valais dont le site est lent, difficile à administrer ou peu clair à moderniser son expérience, sa base technique et son référencement.',
  deliverables: [
    'Un audit de l’expérience et de la base technique existante.',
    'Une liste de priorités qui distingue ce qui peut être conservé de ce qui doit évoluer.',
    'Une interface modernisée et les corrections de performance et de SEO retenues dans le périmètre.',
    'La migration et la mise en ligne lorsque les accès et la technologie le permettent.',
  ],
  process: [
    'L’audit commence par le site existant, ses objectifs et les accès disponibles.',
    'Les problèmes sont classés par priorité avant de choisir entre correction et reconstruction.',
    'La réalisation avance avec des validations sur les pages et parcours concernés.',
    'La migration est préparée, vérifiée puis suivie après la mise en ligne.',
  ],
  timeline: 'Le planning est proposé après l’audit. Il dépend de la dette technique, des technologies existantes, des accès, du volume de contenu, des migrations et du rythme des validations.',
  limits: [
    'L’audit détermine ce qui peut réellement être conservé dans le site actuel.',
    'Les effets d’une refonte sur le classement et la conversion restent variables.',
    'Les plateformes et services tiers peuvent limiter les corrections possibles.',
  ],
  nextStep: 'Indiquez-moi l’adresse du site, les difficultés rencontrées et la priorité du moment. L’audit permettra ensuite de définir les actions utiles.',
  proofNote: 'Le portfolio montre les réalisations web actuellement publiées. Les études détaillées ne sont ajoutées qu’après validation de leur contenu.',
  proof: { label: 'Voir les réalisations web du portfolio', path: '/#portfolio' },
  contact: { label: 'Demander un premier audit', path: '/#contact' },
})
const service = Object.freeze({
  name: 'Refonte de site web en Valais',
  description: decisionContent.introduction,
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
  title: 'Refonte de site web en Valais | Antoine Quarroz',
  description: 'Refonte de sites web en Valais : audit, priorités UX et techniques, modernisation, migration et suivi selon le périmètre défini.',
  ogTitle: 'Refonte de site web en Valais | Antoine Quarroz',
  ogDescription: 'Audit et modernisation de l’expérience, de la base technique et du référencement.',
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
        <p data-service-description data-service-introduction data-service-offer data-service-audience data-service-area class="section-subtitle max-w-3xl">
          {{ service.description }}
        </p>

        <UiServiceDecisionContent :content="decisionContent" />
      </div>
    </div>
  </section>
</template>
