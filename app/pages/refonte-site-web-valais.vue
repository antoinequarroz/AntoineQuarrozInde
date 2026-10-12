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
  introduction: 'J’accompagne les indépendants et les PME du Valais pour faire évoluer un site devenu lent, difficile à mettre à jour ou peu clair. Nous commençons par un audit pour décider ce qui mérite une correction et ce qui demande une refonte.',
  deliverables: [
    'Un audit de l’expérience et de la base technique existante.',
    'Un inventaire des pages et contenus à conserver, améliorer, fusionner ou retirer.',
    'Une interface modernisée et les corrections de performance et de SEO retenues dans le périmètre.',
    'Un plan de migration : anciennes et nouvelles adresses, redirections, vérifications et suivi après publication.',
  ],
  process: [
    'L’audit commence par le site existant, ses objectifs et les accès disponibles.',
    'Les pages utiles et les problèmes sont identifiés avant de choisir entre correction ciblée et reconstruction.',
    'La réalisation avance avec des validations sur les pages et parcours concernés.',
    'Les adresses, contenus et formulaires sont vérifiés avant la bascule, puis l’exploration et le trafic sont suivis après la mise en ligne.',
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
  contact: { label: 'Faire le point sur mon site actuel', path: '/#contact' },
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

const { trackPostHog } = usePostHogEvent()
function handleServiceClick(event: MouseEvent) {
  if (!import.meta.client) return
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
  if (!(anchor instanceof HTMLAnchorElement)) return
  const destination = new URL(anchor.href, window.location.href)
  if (destination.origin !== window.location.origin || !['#contact', '#contact-form'].includes(destination.hash)) return
  sessionStorage.setItem('aq_contact_origin', service.path)
  trackPostHog('service_cta_clicked', { service_path: service.path, placement: anchor.dataset.serviceCtaPlacement || 'service_page' })
}
onMounted(() => trackPostHog('service_page_viewed', { service_path: service.path }))

const checks = [
  { title: 'Repérer les pages qui comptent', body: 'Les données Search Console et les usages du site aident à identifier les pages à conserver. Leur rôle pour vos clients compte aussi, même lorsqu’elles reçoivent peu de trafic.' },
  { title: 'Préparer les changements d’adresse', body: 'Lorsque les URL changent, chaque ancienne page utile est associée à une destination pertinente. Les redirections permanentes sont vérifiées ; toutes les pages ne doivent pas être renvoyées vers l’accueil.' },
  { title: 'Vérifier les contenus et l’exploration', body: 'Titres, liens internes, adresses canoniques et sitemap sont contrôlés. Les blocages réservés à la préproduction doivent être retirés avant la mise en ligne.' },
  { title: 'Suivre la bascule', body: 'Après publication, nous contrôlons les erreurs, l’exploration et les évolutions du trafic. Une migration peut entraîner des fluctuations de classement ; leur absence n’est pas garantie.' },
]
const questions = [
  { title: 'Faut-il tout refaire pour améliorer un site ?', body: 'Pas forcément. Une navigation confuse, un formulaire défaillant ou des contenus mal organisés peuvent parfois être corrigés sans reconstruire l’ensemble. L’audit sert à choisir un périmètre proportionné.' },
  { title: 'Puis-je conserver mon domaine et mes contenus ?', body: 'Oui, lorsque les accès et la solution existante le permettent. Les contenus utiles sont recensés avant les changements, et la conservation des adresses est privilégiée lorsqu’elle reste cohérente.' },
  { title: 'Une refonte garantit-elle de garder mes positions Google ?', body: 'Non. Préparer les adresses, les redirections et les contenus limite les risques, mais Google doit explorer et traiter les changements. Les positions peuvent fluctuer et leur progression ne peut pas être promise.' },
  { title: 'De quoi dépend le budget de la refonte ?', body: 'Du nombre de pages, de l’état technique, des contenus à reprendre, des fonctions et des migrations nécessaires. Le devis distingue les corrections utiles, les options et les éventuels services tiers.' },
]

useSeoMeta({
  title: 'Refonte de site web en Valais | Antoine Quarroz',
  description: 'Refonte de site web en Valais : audit de l’existant, contenus à conserver, redirections et migration préparée. Présentez-moi votre site pour définir les priorités.',
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
  <div @click="handleServiceClick">
    <section class="section-padding section-surface !pt-28 md:!pt-32">
      <div class="section-background"><div class="section-grid" /></div>
      <div class="section-container relative z-10">
        <div class="mx-auto max-w-5xl">
          <UiAppBreadcrumbs :items="breadcrumbs.items" class="mb-6" />
          <span class="badge mb-4">Partir de votre site actuel</span>
          <h1 data-service-name class="section-heading">{{ service.name }}</h1>
          <p data-service-description data-service-introduction data-service-offer data-service-audience data-service-area class="section-subtitle max-w-3xl">{{ service.description }}</p>
          <div class="mt-7 flex flex-col gap-3 sm:flex-row">
            <NuxtLink to="/#contact-form" data-service-cta-placement="introduction" class="btn-primary min-h-12 justify-center">Faire le point sur mon site actuel</NuxtLink>
            <a href="#migration-seo" class="btn-secondary min-h-12 justify-center">Comprendre les précautions SEO</a>
          </div>
          <p class="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-400">Présentez l’adresse de votre site et ce qui vous freine · Premier avis sans engagement</p>
          <UiServiceDecisionContent :content="decisionContent" />
        </div>
      </div>
    </section>
    <section id="migration-seo" class="scroll-mt-28 py-16 md:py-20" aria-labelledby="migration-title">
      <div class="section-container"><div class="mx-auto max-w-5xl">
        <p class="text-sm font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">Préparer la migration</p>
        <h2 id="migration-title" class="mt-3 font-display text-3xl font-bold text-gray-950 dark:text-white">Préserver les pages utiles et préparer le référencement</h2>
        <p class="mt-4 max-w-3xl leading-7 text-gray-600 dark:text-gray-300">La refonte ne se limite pas au design. Les contenus, les adresses et les parcours existants demandent un plan de reprise adapté au site.</p>
        <div class="mt-8 grid gap-5 sm:grid-cols-2">
          <article v-for="(check, index) in checks" :key="check.title" class="rounded-3xl border border-violet-500/15 bg-white/75 p-6 dark:bg-white/[0.04]">
            <span class="text-sm font-bold text-violet-700 dark:text-violet-300">0{{ index + 1 }}</span>
            <h3 class="mt-3 font-display text-xl font-bold text-gray-950 dark:text-white">{{ check.title }}</h3>
            <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ check.body }}</p>
          </article>
        </div>
        <p class="mt-5 text-sm leading-6 text-gray-600 dark:text-gray-400">Ces précautions s’appuient sur les <a href="https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes?hl=fr" class="font-semibold text-violet-700 underline underline-offset-4 dark:text-violet-300">recommandations de Google pour les migrations de site</a>. Elles ne garantissent ni classement ni volume de demandes.</p>
      </div></div>
    </section>
    <section class="pb-16 md:pb-20" aria-labelledby="refonte-faq-title">
      <div class="section-container"><div class="mx-auto max-w-5xl">
        <h2 id="refonte-faq-title" class="font-display text-3xl font-bold text-gray-950 dark:text-white">Les questions à clarifier avant une refonte</h2>
        <div class="mt-8 grid gap-5 sm:grid-cols-2">
          <article v-for="question in questions" :key="question.title" class="rounded-3xl border border-violet-500/15 p-6">
            <h3 class="font-display text-xl font-bold text-gray-950 dark:text-white">{{ question.title }}</h3>
            <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ question.body }}</p>
          </article>
        </div>
        <div class="mt-10 rounded-3xl bg-violet-500/10 p-6 sm:p-8">
          <h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">Commencer par ce qui vous bloque</h2>
          <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">Envoyez l’adresse de votre site, les difficultés rencontrées et votre objectif. Nous pourrons distinguer une correction ciblée d’une refonte plus large.</p>
          <NuxtLink to="/#contact-form" data-service-cta-placement="conclusion" class="btn-primary mt-6 min-h-12 justify-center">Présenter mon site et ses difficultés</NuxtLink>
          <NuxtLink to="/creation-site-internet-valais" class="mt-4 block min-h-11 font-semibold leading-6 text-violet-700 underline underline-offset-4 dark:text-violet-300">Vous partez de zéro ? Voir la création de site en Valais</NuxtLink>
        </div>
        <BlogServiceResources service-path="/refonte-site-web-valais" />
      </div></div>
    </section>
  </div>
</template>
