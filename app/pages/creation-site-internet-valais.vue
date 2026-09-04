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
  introduction: 'Je conçois des sites internet sur mesure pour les indépendants, les PME et les jeunes entreprises du Valais qui veulent présenter clairement leur offre et faciliter la prise de contact.',
  deliverables: [
    'Une structure de pages organisée autour de votre offre et de vos publics.',
    'Une interface responsive adaptée aux écrans mobiles et aux ordinateurs.',
    'L’intégration des contenus et un CMS lorsque le périmètre le demande.',
    'Une base SEO technique, le déploiement et une prise en main des outils livrés.',
  ],
  process: [
    'Nous clarifions les objectifs, les publics et les contenus disponibles.',
    'La structure des pages et la direction visuelle sont validées avant le développement.',
    'Le site est réalisé puis ajusté à partir de vos retours regroupés.',
    'La mise en ligne suit les vérifications techniques et éditoriales prévues.',
  ],
  timeline: 'Le planning est défini après le cadrage. Il dépend du nombre de pages, de la disponibilité des contenus, du niveau de personnalisation, des intégrations et du rythme des validations.',
  limits: [
    'Le classement dans les moteurs et le volume de demandes restent variables après la mise en ligne.',
    'La rédaction, les médias et les intégrations supplémentaires sont cadrés selon les éléments disponibles.',
    'Les services tiers conservent leurs propres conditions et contraintes techniques.',
  ],
  nextStep: 'Expliquez-moi votre offre, le public visé et ce que le site doit permettre de faire. Je pourrai alors proposer une structure et un périmètre adaptés.',
  proofNote: 'Le portfolio présente les réalisations actuellement publiées. Les études détaillées ne sont ajoutées qu’après validation de leur contenu.',
  proof: { label: 'Voir les réalisations du portfolio', path: '/#portfolio' },
  contact: { label: 'Présenter mon projet de site', path: '/#contact' },
})
const service = Object.freeze({
  name: 'Création de site internet en Valais',
  description: decisionContent.introduction,
  path: '/creation-site-internet-valais',
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
  title: 'Création de site internet en Valais | Antoine Quarroz',
  description: 'Création de sites internet sur mesure en Valais : structure, design responsive, intégration des contenus, base SEO technique et mise en ligne.',
  ogTitle: 'Création de site internet en Valais | Antoine Quarroz',
  ogDescription: 'Sites sur mesure pour présenter clairement votre offre et faciliter la prise de contact.',
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
        <span class="badge mb-4">Service</span>
        <h1 data-service-name class="section-heading">{{ service.name }}</h1>
        <p data-service-description data-service-introduction data-service-offer data-service-audience data-service-area class="section-subtitle max-w-3xl">
          {{ service.description }}
        </p>

        <UiServiceDecisionContent :content="decisionContent" />
      </div>
    </div>
  </section>
</template>
