<script setup lang="ts">
import {
  resolvePublicBreadcrumbTrail,
  resolvePublicService,
} from '~~/shared/utils/publicStructuredData'
import { resolvePublicServiceDecisionContent } from '~~/shared/utils/publicServiceContent'
import { serializeJsonLd } from '~~/shared/utils/publicSeoIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')
const projectsStore = useProjectsStore()
const reviewsStore = useReviewsStore()
const { trackPostHog } = usePostHogEvent()

await Promise.all([projectsStore.ensureLoaded(), reviewsStore.ensureLoaded()])

const decisionContent = resolvePublicServiceDecisionContent({
  introduction: 'Je conçois des sites web sur mesure pour les PME, les indépendants et les jeunes entreprises du Valais qui veulent expliquer clairement leur offre, être trouvés localement et transformer une visite en demande utile.',
  deliverables: [
    'Une structure de pages organisée autour de votre offre, de vos publics et des actions attendues.',
    'Une interface responsive vérifiée sur mobile, tablette et ordinateur.',
    'L’intégration des contenus, des formulaires et d’un CMS lorsque le périmètre le demande.',
    'Une base SEO technique, le suivi des conversions, le déploiement et une prise en main des outils livrés.',
  ],
  process: [
    'Nous clarifions les objectifs, les publics, les contenus disponibles et la demande que le site doit faciliter.',
    'La structure des pages, les parcours et la direction visuelle sont validés avant le développement.',
    'Le site est réalisé par étapes puis ajusté à partir de retours regroupés.',
    'La mise en ligne suit les vérifications techniques, éditoriales, mobiles et SEO prévues.',
  ],
  timeline: 'Le planning est défini après le cadrage. Il dépend du nombre de pages, de la disponibilité des contenus, du niveau de personnalisation, des intégrations et du rythme des validations.',
  limits: [
    'Le classement dans les moteurs et le volume de demandes restent variables après la mise en ligne.',
    'La rédaction, les médias et les intégrations supplémentaires sont cadrés selon les éléments disponibles.',
    'Les services tiers conservent leurs propres conditions et contraintes techniques.',
  ],
  nextStep: 'Expliquez-moi votre offre, le public visé et ce que le site doit permettre de faire. Je pourrai alors proposer une structure, un périmètre et un devis adaptés.',
  proofNote: 'Les études présentées sur le site sont publiées uniquement lorsque leur contenu et le niveau de divulgation ont été approuvés.',
  proof: { label: 'Voir les cas clients publiés', path: '/#portfolio' },
  contact: { label: 'Présenter mon projet de site', path: '/#contact' },
})
const service = Object.freeze({
  name: 'Création de site web pour PME en Valais',
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

const useCases = [
  {
    title: 'Présenter une offre clairement',
    description: 'Un site vitrine structuré par besoins aide vos futurs clients à comprendre rapidement ce que vous faites, pour qui et comment vous contacter.',
  },
  {
    title: 'Recevoir des demandes qualifiées',
    description: 'Les formulaires, appels à l’action et pages de services sont conçus pour recueillir les informations utiles sans imposer un parcours trop long.',
  },
  {
    title: 'Publier du contenu utile',
    description: 'Un blog ou un espace de ressources peut répondre aux questions de vos prospects et soutenir votre visibilité locale dans la durée.',
  },
  {
    title: 'Relier vos outils',
    description: 'Selon le besoin, le site peut être connecté à une prise de rendez-vous, une newsletter, un CRM ou un outil métier déjà utilisé par votre équipe.',
  },
]

const budgetFactors = [
  'Le nombre de pages et la quantité de contenu à structurer ou rédiger.',
  'Le niveau de personnalisation du design et des parcours.',
  'Les fonctions attendues : formulaires, espace client, catalogue, réservation ou connexions à des services tiers.',
  'La reprise de données, les langues, les contraintes de conformité et l’accompagnement après la mise en ligne.',
]

const frequentlyAskedQuestions = [
  {
    question: 'Combien de temps faut-il pour créer un site de PME ?',
    answer: 'Le délai est confirmé après le cadrage. Il varie surtout selon le nombre de pages, les contenus disponibles, les fonctions à intégrer et la rapidité des validations. Le planning figure dans la proposition avant le démarrage.',
  },
  {
    question: 'Le site m’appartient-il après la livraison ?',
    answer: 'Les droits, les accès, les licences et les éléments transmis sont précisés dans le devis et le contrat. Vous savez ainsi avant le projet ce qui vous appartient et quels services externes restent soumis à un abonnement.',
  },
  {
    question: 'Le référencement naturel est-il inclus ?',
    answer: 'La base SEO technique est incluse dans le périmètre annoncé : structure des titres, métadonnées, indexation, sitemap, performance et données structurées pertinentes. La production régulière de contenu et l’acquisition de liens font l’objet d’un accompagnement distinct.',
  },
  {
    question: 'Puis-je modifier les contenus moi-même ?',
    answer: 'Oui lorsque le projet prévoit un CMS ou une interface d’administration. Les contenus qui doivent rester modifiables sont identifiés pendant le cadrage afin de choisir une solution adaptée à votre équipe.',
  },
  {
    question: 'Travaillez-vous seulement avec des entreprises de Sion ?',
    answer: 'Non. J’accompagne des entreprises dans tout le Valais, notamment autour de Sion, Sierre, Martigny et Monthey. Les échanges peuvent avoir lieu sur place ou à distance selon le projet.',
  },
]

const approvedCases = computed(() => projectsStore.projects.filter(project => (
  project.caseStudyPublished
  && project.caseStudyApprovedAt
  && project.relatedServicePaths.includes(service.path)
)).slice(0, 3))
const featuredCase = computed(() => approvedCases.value[0] ?? null)
const featuredReview = computed(() => {
  const project = featuredCase.value
  if (!project) return null
  const names = [project.title, project.clientLabel]
    .filter(Boolean)
    .map(value => String(value).toLocaleLowerCase('fr'))
  return reviewsStore.visible.find(review => names.includes(String(review.company || '').toLocaleLowerCase('fr'))) ?? null
})

function handleServicePageClick(event: MouseEvent) {
  if (!import.meta.client) return
  const target = event.target instanceof Element ? event.target.closest('a[href]') : null
  if (!(target instanceof HTMLAnchorElement)) return
  const destination = new URL(target.href, window.location.href)
  if (destination.origin !== window.location.origin || !['#contact', '#contact-form'].includes(destination.hash)) return
  sessionStorage.setItem('aq_contact_origin', service.path)
  trackPostHog('service_cta_clicked', {
    service_path: service.path,
    placement: target.dataset.serviceCtaPlacement || 'service_page',
  })
}

onMounted(() => {
  trackPostHog('service_page_viewed', { service_path: service.path })
})

useSeoMeta({
  title: 'Création de site web pour PME en Valais | Antoine Quarroz',
  description: 'Site web sur mesure pour PME en Valais : cadrage, design responsive, contenus, SEO technique, intégrations et mise en ligne avec un périmètre clair.',
  ogTitle: 'Création de site web pour PME en Valais | Antoine Quarroz',
  ogDescription: 'Un site clair, rapide et administrable pour présenter votre offre et faciliter les demandes de vos clients en Valais.',
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
  <main class="section-surface" @click.capture="handleServicePageClick">
    <section class="section-padding">
      <div class="section-background"><div class="section-grid" /></div>
      <div class="section-container relative z-10">
        <div class="mx-auto max-w-5xl">
          <UiAppBreadcrumbs :items="breadcrumbs.items" class="mb-6" />
          <span class="badge mb-4">Site web pour PME</span>
          <h1 data-service-name class="section-heading">{{ service.name }}</h1>
          <p data-service-description data-service-introduction data-service-offer data-service-audience data-service-area class="section-subtitle max-w-3xl">
            {{ service.description }}
          </p>

          <UiServiceDecisionContent :content="decisionContent" />
        </div>
      </div>
    </section>

    <section class="border-y border-violet-500/10 bg-white/55 py-16 dark:border-white/10 dark:bg-white/[0.02] md:py-24" aria-labelledby="pme-needs-title">
      <div class="section-container">
        <div class="mx-auto max-w-5xl">
          <p class="text-sm font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Partir du besoin réel</p>
          <h2 id="pme-needs-title" class="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight text-gray-950 dark:text-white sm:text-4xl">
            Quel site est utile à votre PME valaisanne ?
          </h2>
          <p class="mt-5 max-w-3xl text-lg leading-8 text-gray-600 dark:text-gray-300">
            Le bon projet ne commence pas par une liste de technologies. Il commence par une action concrète à simplifier pour vos clients ou votre équipe. Voici les besoins que nous pouvons cadrer ensemble.
          </p>

          <div class="mt-10 grid gap-5 md:grid-cols-2">
            <article v-for="(useCase, index) in useCases" :key="useCase.title" class="rounded-3xl border border-violet-500/15 bg-white/80 p-6 shadow-lg shadow-violet-500/5 dark:border-white/10 dark:bg-white/[0.04]">
              <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 font-display text-sm font-bold text-violet-700 dark:bg-violet-400/15 dark:text-violet-200">{{ String(index + 1).padStart(2, '0') }}</span>
              <h3 class="mt-5 font-display text-xl font-bold text-gray-950 dark:text-white">{{ useCase.title }}</h3>
              <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ useCase.description }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="py-16 md:py-24" aria-labelledby="budget-title">
      <div class="section-container">
        <div class="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <p class="text-sm font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">Budget transparent</p>
            <h2 id="budget-title" class="mt-3 font-display text-3xl font-bold leading-tight text-gray-950 dark:text-white sm:text-4xl">
              De quoi dépend le prix d’un site web ?
            </h2>
            <p class="mt-5 leading-7 text-gray-600 dark:text-gray-300">
              Je ne propose pas un prix d’appel qui change après le premier échange. Le devis découpe le projet en livrables et distingue ce qui est inclus, optionnel ou dépendant d’un service tiers.
            </p>
          </div>
          <div class="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-6 sm:p-8">
            <ul class="space-y-4">
              <li v-for="factor in budgetFactors" :key="factor" class="flex gap-4 leading-7 text-gray-700 dark:text-gray-200">
                <span aria-hidden="true" class="mt-2 h-3 w-3 shrink-0 rounded-full border-2 border-cyan-500" />
                <span>{{ factor }}</span>
              </li>
            </ul>
            <NuxtLink to="/#contact" data-service-cta-placement="budget" class="btn-primary mt-7 min-h-11 justify-center sm:justify-start">Demander un périmètre et un devis</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-violet-500/10 bg-violet-50/55 py-16 dark:border-white/10 dark:bg-white/[0.025] md:py-24" aria-labelledby="proof-title">
      <div class="section-container">
        <div class="mx-auto max-w-5xl">
          <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-sm font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Preuves publiées</p>
              <h2 id="proof-title" class="mt-3 font-display text-3xl font-bold text-gray-950 dark:text-white sm:text-4xl">Des projets présentés avec leur contexte</h2>
            </div>
            <NuxtLink to="/cas-clients-valais" class="btn-secondary min-h-11 justify-center">Voir tous les cas clients</NuxtLink>
          </div>

          <div v-if="featuredCase" class="mt-10 overflow-hidden rounded-[2rem] border border-violet-500/15 bg-white/85 shadow-xl shadow-violet-500/5 dark:border-white/10 dark:bg-white/[0.04]">
            <div class="grid lg:grid-cols-[1.08fr_0.92fr]">
              <img v-if="featuredCase.image" :src="featuredCase.image" :alt="`Aperçu du projet ${featuredCase.title}`" class="h-full min-h-64 w-full object-cover" loading="lazy" decoding="async">
              <div class="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Étude de cas vérifiée</p>
                <h3 class="mt-3 font-display text-3xl font-bold text-gray-950 dark:text-white">{{ featuredCase.title }}</h3>
                <p class="mt-4 leading-7 text-gray-600 dark:text-gray-300">{{ featuredCase.outcome || featuredCase.description }}</p>
                <blockquote v-if="featuredReview" class="mt-5 border-l-2 border-violet-500 pl-4 text-sm italic leading-6 text-gray-600 dark:text-gray-300">
                  “{{ featuredReview.content }}”
                  <footer class="mt-2 not-italic font-semibold text-gray-900 dark:text-white">{{ featuredReview.author }}, {{ featuredReview.role }}</footer>
                </blockquote>
                <div class="mt-6 flex flex-col gap-3 sm:flex-row">
                  <NuxtLink :to="`/projets/${featuredCase.slug}`" class="btn-primary min-h-11 justify-center">Lire l’étude de cas</NuxtLink>
                  <NuxtLink to="/#contact" data-service-cta-placement="case_study" class="btn-secondary min-h-11 justify-center">Présenter mon projet</NuxtLink>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="mt-8 max-w-3xl rounded-3xl border border-violet-500/15 bg-white/70 p-6 leading-7 text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300">
            Les réalisations visibles dans le portfolio permettent déjà d’examiner les interfaces et les types de projets livrés. Les études détaillées apparaissent ici seulement après validation de leur contenu par le client.
          </p>
        </div>
      </div>
    </section>

    <section class="py-16 md:py-24" aria-labelledby="faq-title">
      <div class="section-container">
        <div class="mx-auto max-w-5xl">
          <p class="text-sm font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">Questions fréquentes</p>
          <h2 id="faq-title" class="mt-3 font-display text-3xl font-bold text-gray-950 dark:text-white sm:text-4xl">Ce qu’une PME doit savoir avant de démarrer</h2>
          <div class="mt-10 grid gap-5 md:grid-cols-2">
            <article v-for="item in frequentlyAskedQuestions" :key="item.question" class="rounded-3xl border border-violet-500/15 bg-white/75 p-6 dark:border-white/10 dark:bg-white/[0.04]">
              <h3 class="font-display text-xl font-bold text-gray-950 dark:text-white">{{ item.question }}</h3>
              <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ item.answer }}</p>
            </article>
          </div>

          <div class="mt-10 flex flex-col gap-4 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-violet-500/10 to-cyan-400/10 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div class="max-w-2xl">
              <h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">Vous avez déjà un site ?</h2>
              <p class="mt-2 leading-7 text-gray-600 dark:text-gray-300">Un audit permet de décider s’il vaut mieux corriger l’existant ou préparer une refonte plus large.</p>
            </div>
            <div class="flex flex-col gap-3 sm:flex-row">
              <NuxtLink to="/refonte-site-web-valais" class="btn-secondary min-h-11 justify-center">Découvrir la refonte</NuxtLink>
              <NuxtLink to="/developpeur-web-valais" class="btn-secondary min-h-11 justify-center">Voir l’accompagnement web</NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
