<script setup lang="ts">
import {
  resolvePublicBreadcrumbTrail,
  resolvePublicService,
} from '~~/shared/utils/publicStructuredData'
import { resolvePublicServiceDecisionContent } from '~~/shared/utils/publicServiceContent'
import { serializeJsonLd } from '~~/shared/utils/publicSeoIdentity'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')
const { trackPostHog } = usePostHogEvent()

const servicePath = '/audit-ia-pme'
const decisionContent = resolvePublicServiceDecisionContent({
  introduction: 'J’aide les PME du Valais et d’ailleurs en Suisse à choisir un premier usage de l’intelligence artificielle qui répond à un besoin réel, protège les données de l’entreprise et peut être mesuré avant d’investir davantage.',
  deliverables: [
    'Une cartographie courte du processus, des personnes concernées et du temps consacré aujourd’hui.',
    'Une classification des données utilisées et des précautions à prévoir avant tout test.',
    'Une comparaison des options possibles : règle simple, automatisation classique, outil IA ou agent supervisé.',
    'Un plan de pilote sur trente jours avec responsable, indicateurs, contrôles humains et décision de suite.',
  ],
  process: [
    'Vous décrivez le processus, les outils actuels, les irritants et le résultat attendu.',
    'Nous séparons les tâches répétitives des décisions qui doivent rester humaines.',
    'Les solutions sont comparées selon leur utilité, leurs données, leur coût d’exploitation et leur complexité.',
    'Vous recevez un périmètre de test mesurable avant toute réalisation plus importante.',
  ],
  timeline: 'Le délai est confirmé après le premier échange. Il dépend du nombre de processus à examiner, des personnes concernées et des informations disponibles.',
  limits: [
    'L’audit ne remplace pas une analyse juridique, une décision de sécurité ou une validation métier spécialisée.',
    'Un outil IA peut produire des résultats inexacts et doit rester supervisé pour les usages sensibles.',
    'Le gain réel dépend de la qualité du processus initial, des données et de l’adoption par l’équipe.',
  ],
  nextStep: 'Décrivez une tâche répétitive, sa fréquence et les personnes qui y participent. Je vous dirai si elle mérite un audit, un simple ajustement ou un premier pilote.',
  proofNote: 'Le portfolio présente les réalisations publiques. La checklist IA permet aussi de préparer les informations utiles avant notre échange.',
  proof: { label: 'Voir les projets publiés', path: '/#portfolio' },
  contact: { label: 'Présenter mon processus', path: '/#contact' },
})

const service = Object.freeze({
  name: 'Trouvez le bon premier usage de l’IA pour votre PME.',
  description: decisionContent.introduction,
  path: servicePath,
  areaServed: 'Valais',
})
const breadcrumbs = resolvePublicBreadcrumbTrail(siteUrl, [
  { name: 'Accueil', path: '/' },
  { name: 'Audit IA pour PME en Valais', path: service.path },
])
const canonicalUrl = breadcrumbs.items.at(-1)!.url
const serviceJsonLd = resolvePublicService(siteUrl, {
  ...service,
  serviceType: service.name,
})

const goodStartingPoints = [
  {
    title: 'Une tâche fréquente',
    description: 'Elle revient chaque semaine et mobilise plusieurs personnes ou plusieurs outils.',
    icon: 'repeat',
  },
  {
    title: 'Un résultat vérifiable',
    description: 'Le temps, les erreurs, les délais ou le volume traité peuvent être comparés avant et après.',
    icon: 'chart',
  },
  {
    title: 'Des données maîtrisées',
    description: 'L’équipe sait quelles informations sont publiques, internes, confidentielles ou personnelles.',
    icon: 'shield',
  },
]

const decisionOptions = [
  { label: 'Règle simple', description: 'Pour une décision stable, explicable et sans interprétation.' },
  { label: 'Automatisation', description: 'Pour relier des étapes répétitives avec des entrées prévisibles.' },
  { label: 'Assistant IA', description: 'Pour résumer, classer ou préparer un résultat relu par une personne.' },
  { label: 'Agent supervisé', description: 'Pour enchaîner plusieurs actions avec des limites et des validations.' },
]

function handlePageClick(event: MouseEvent) {
  if (!import.meta.client) return
  const target = event.target instanceof Element ? event.target.closest('a[href]') : null
  if (!(target instanceof HTMLAnchorElement)) return
  const destination = new URL(target.href, window.location.href)
  if (destination.origin !== window.location.origin) return

  if (destination.hash === '#contact' || destination.hash === '#contact-form') {
    sessionStorage.setItem('aq_contact_origin', servicePath)
    trackPostHog('service_cta_clicked', {
      service_path: servicePath,
      placement: target.dataset.serviceCtaPlacement || 'audit_page',
    })
  }
  else if (destination.pathname === '/ressources/checklist-ia-pme') {
    trackPostHog('audit_resource_clicked', {
      service_path: servicePath,
      resource_path: destination.pathname,
    })
  }
}

onMounted(() => {
  trackPostHog('service_page_viewed', { service_path: servicePath })
})

useSeoMeta({
  title: 'Audit IA pour PME en Suisse | Antoine Quarroz',
  description: 'Cadrez un premier projet IA utile et mesurable : processus, données, choix de solution, validation humaine et plan pilote sur 30 jours.',
  ogTitle: 'Audit IA pour PME en Suisse | Antoine Quarroz',
  ogDescription: 'Un cadrage concret pour choisir le bon usage, protéger les données et mesurer un premier pilote IA.',
  ogUrl: canonicalUrl,
  robots: 'index, follow',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
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
  <main class="section-surface overflow-hidden" @click.capture="handlePageClick">
    <section class="relative pb-16 pt-32 sm:pb-20 sm:pt-36 lg:pb-28">
      <div class="section-background"><div class="section-grid" /></div>
      <div aria-hidden="true" class="pointer-events-none absolute left-1/2 top-28 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-cyan-400/15 blur-3xl" />

      <div class="section-container relative z-10">
        <div class="mx-auto max-w-6xl">
          <UiAppBreadcrumbs :items="breadcrumbs.items" class="mb-8" />
          <div class="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
            <div>
              <span class="badge mb-5">Conseil IA pour PME</span>
              <h1 data-service-name class="max-w-4xl text-balance font-display text-4xl font-bold leading-[1.04] tracking-[-0.035em] text-gray-950 dark:text-white sm:text-5xl lg:text-6xl">
                Trouvez le bon premier usage de l’IA pour votre PME.
              </h1>
              <p data-service-description data-service-introduction data-service-offer data-service-audience data-service-area class="mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300">
                {{ service.description }}
              </p>
              <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <NuxtLink to="/#contact" data-service-cta-placement="hero" class="btn-primary min-h-11 justify-center active:scale-[0.96] sm:justify-start">
                  Présenter mon processus
                </NuxtLink>
                <NuxtLink to="/ressources/checklist-ia-pme" class="btn-secondary min-h-11 justify-center active:scale-[0.96] sm:justify-start">
                  Télécharger la checklist
                </NuxtLink>
              </div>
              <p class="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-400">
                Vous repartez avec une décision et un périmètre de test, même si l’IA n’est pas la bonne solution.
              </p>
            </div>

            <div class="relative mx-auto w-full max-w-xl lg:max-w-none" aria-label="Comparaison des solutions possibles">
              <div class="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-violet-500/20 to-cyan-400/15 blur-2xl" />
              <div class="relative rounded-[2rem] border border-violet-500/15 bg-white/85 p-5 shadow-2xl shadow-violet-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#11111d]/85 sm:p-7">
                <div class="flex items-center justify-between gap-4 border-b border-violet-500/10 pb-5 dark:border-white/10">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Décision de cadrage</p>
                    <p class="mt-1 font-display text-xl font-bold text-gray-950 dark:text-white">Choisir le niveau juste</p>
                  </div>
                  <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/20">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </span>
                </div>
                <ol class="mt-5 space-y-3">
                  <li v-for="(option, index) in decisionOptions" :key="option.label" class="group flex gap-4 rounded-2xl bg-violet-500/[0.055] p-4 dark:bg-white/[0.045]">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white font-display text-sm font-bold tabular-nums text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-200">{{ String(index + 1).padStart(2, '0') }}</span>
                    <span>
                      <span class="block font-semibold text-gray-950 dark:text-white">{{ option.label }}</span>
                      <span class="mt-1 block text-sm leading-6 text-gray-600 dark:text-gray-300">{{ option.description }}</span>
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-violet-500/10 bg-white/55 py-16 dark:border-white/10 dark:bg-white/[0.02] md:py-24" aria-labelledby="starting-point-title">
      <div class="section-container">
        <div class="mx-auto max-w-6xl">
          <div class="max-w-3xl">
            <p class="text-sm font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Un point de départ raisonnable</p>
            <h2 id="starting-point-title" class="mt-3 text-balance font-display text-3xl font-bold leading-tight text-gray-950 dark:text-white sm:text-4xl">Commencez par un processus simple à observer.</h2>
            <p class="mt-5 text-lg leading-8 text-gray-600 dark:text-gray-300">Un bon pilote ne cherche pas à transformer toute l’entreprise. Il teste une hypothèse précise avec un risque limité.</p>
          </div>

          <div class="mt-10 grid gap-5 md:grid-cols-3">
            <article v-for="item in goodStartingPoints" :key="item.title" class="rounded-3xl border border-violet-500/15 bg-white/80 p-6 shadow-lg shadow-violet-500/5 dark:border-white/10 dark:bg-white/[0.04]">
              <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/12 to-cyan-400/12 text-violet-700 dark:text-violet-200">
                <svg v-if="item.icon === 'repeat'" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m16.023 9.348 1.605-1.604a4.5 4.5 0 0 1 6.364 6.364l-3.182 3.182a4.5 4.5 0 0 1-6.364 0l-1.125-1.125m-5.344-1.513-1.605 1.604a4.5 4.5 0 0 1-6.364-6.364L3.19 6.71a4.5 4.5 0 0 1 6.364 0l1.125 1.125" /></svg>
                <svg v-else-if="item.icon === 'chart'" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75Zm6.75-4.5c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625Zm6.75-4.5c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m6-3.75c0 7.142-3.75 12-9 13.5C6.75 18 3 13.142 3 6c2.624 0 5.216-1.115 7.002-2.996a2.996 2.996 0 0 1 3.996 0C15.784 4.885 18.376 6 21 6Z" /></svg>
              </span>
              <h3 class="mt-5 font-display text-xl font-bold text-gray-950 dark:text-white">{{ item.title }}</h3>
              <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ item.description }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="py-16 md:py-24" aria-labelledby="audit-content-title">
      <div class="section-container">
        <div class="mx-auto max-w-5xl">
          <p class="text-sm font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">Du besoin à la décision</p>
          <h2 id="audit-content-title" class="mt-3 max-w-3xl text-balance font-display text-3xl font-bold leading-tight text-gray-950 dark:text-white sm:text-4xl">Ce que l’audit vous permet de décider.</h2>
          <UiServiceDecisionContent :content="decisionContent" />
        </div>
      </div>
    </section>

    <section class="border-t border-violet-500/10 bg-violet-50/60 py-16 dark:border-white/10 dark:bg-white/[0.025] md:py-24" aria-labelledby="audit-cta-title">
      <div class="section-container">
        <div class="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-violet-500/15 bg-gradient-to-br from-violet-600 via-violet-700 to-cyan-700 p-7 text-white shadow-2xl shadow-violet-500/20 sm:p-10 lg:p-12">
          <div class="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p class="text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">Un cas concret suffit pour commencer</p>
              <h2 id="audit-cta-title" class="mt-3 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-4xl">Quelle tâche aimeriez-vous simplifier en premier&nbsp;?</h2>
              <p class="mt-4 max-w-2xl leading-7 text-white/80">Indiquez sa fréquence, les outils concernés et ce qui vous fait perdre du temps. Nous pourrons déterminer la prochaine étape utile.</p>
            </div>
            <NuxtLink to="/#contact" data-service-cta-placement="closing" class="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-violet-800 shadow-lg transition-[background-color,transform] duration-150 hover:bg-violet-50 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-700">
              Présenter mon processus
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
