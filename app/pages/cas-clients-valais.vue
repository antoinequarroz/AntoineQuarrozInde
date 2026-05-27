<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')

const cases = [
  {
    client: 'Etablissement local - Valais',
    title: 'Refonte de site vitrine pour clarifier l offre',
    challenge: 'Site vieillissant, message confus, prise de contact faible.',
    solution: 'Refonte UX, hierarchie de contenu simplifiee, optimisation performance et SEO local.',
    result: 'Navigation plus lisible, meilleure perception de marque, plus de demandes qualifiees.',
    stack: ['Nuxt', 'Tailwind', 'SEO technique'],
  },
  {
    client: 'Cabinet sante - Valais central',
    title: 'Site oriente conversion pour prise de rendez-vous',
    challenge: 'Parcours utilisateur long et informations essentielles peu visibles.',
    solution: 'Architecture des pages orientee intentions, sections preuve, CTA visibles et contenu re-ecrit.',
    result: 'Parcours plus court, experience mobile plus fluide, progression des prises de contact.',
    stack: ['Vue', 'Design system', 'Copywriting UX'],
  },
  {
    client: 'PME de services - Bas-Valais',
    title: 'Back-office simple pour gagner du temps au quotidien',
    challenge: 'Gestion de contenu manuelle et repetitive.',
    solution: 'Mise en place d un espace admin adapte aux besoins reels de l equipe.',
    result: 'Moins de friction au quotidien, plus d autonomie sur les mises a jour.',
    stack: ['Nuxt', 'Supabase', 'PostgreSQL'],
  },
]

const faq = [
  {
    q: 'Combien coute un site web en Valais ?',
    a: 'Le budget depend du volume de pages, du niveau de personnalisation et des integrations. Un cadrage court permet de chiffrer proprement.',
  },
  {
    q: 'En combien de temps un projet peut etre livre ?',
    a: 'Pour un site vitrine standard, la livraison se fait souvent en quelques semaines selon le contenu disponible et le rythme de validation.',
  },
  {
    q: 'Le site est-il optimise pour le SEO local ?',
    a: 'Oui. Structure technique, balises, performance, maillage interne et pages ciblees sont prepares pour un referencement local solide.',
  },
]

useSeoMeta({
  title: 'Cas clients | Developpeur web en Valais - Antoine Quarroz',
  description: 'Etudes de cas web en Valais: contexte, approche, decisions techniques et resultats business pour independants, PME et startups.',
  ogTitle: 'Cas clients web en Valais - Antoine Quarroz',
  ogDescription: 'Retours concrets sur des projets web et mobile en Valais: objectifs, execution et impact.',
  ogUrl: `${siteUrl}/cas-clients-valais`,
  ogType: 'website',
  robots: 'index, follow',
})

useHead({
  link: [
    { rel: 'canonical', href: `${siteUrl}/cas-clients-valais` },
  ],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      }),
    },
  ],
})
</script>

<template>
  <section class="section-padding section-surface">
    <div class="section-background">
      <div class="section-grid" />
    </div>

    <div class="section-container relative z-10">
      <div class="mx-auto max-w-5xl">
        <h1 class="section-heading">
          Cas clients web en Valais
        </h1>
        <p class="section-subtitle max-w-3xl">
          Des projets menes de bout en bout, avec une logique simple: clarifier l offre, reduire la friction
          utilisateur et transformer le trafic en demandes qualifiees.
        </p>

        <div class="mt-10 grid gap-5">
          <article
            v-for="item in cases"
            :key="item.title"
            class="rounded-2xl border border-violet-500/15 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
              {{ item.client }}
            </p>
            <h2 class="mt-2 font-display text-2xl font-bold text-gray-900 dark:text-white">
              {{ item.title }}
            </h2>
            <div class="mt-4 grid gap-3 md:grid-cols-3">
              <div class="rounded-xl border border-violet-500/10 p-3 dark:border-white/10">
                <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Defi</p>
                <p class="mt-1 text-sm text-gray-700 dark:text-gray-200">{{ item.challenge }}</p>
              </div>
              <div class="rounded-xl border border-violet-500/10 p-3 dark:border-white/10">
                <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Solution</p>
                <p class="mt-1 text-sm text-gray-700 dark:text-gray-200">{{ item.solution }}</p>
              </div>
              <div class="rounded-xl border border-violet-500/10 p-3 dark:border-white/10">
                <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Resultat</p>
                <p class="mt-1 text-sm text-gray-700 dark:text-gray-200">{{ item.result }}</p>
              </div>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="tag in item.stack"
                :key="tag"
                class="rounded-full border border-violet-500/15 px-3 py-1 text-xs text-violet-700 dark:border-violet-400/25 dark:text-violet-200"
              >
                {{ tag }}
              </span>
            </div>
          </article>
        </div>

        <div class="mt-10 rounded-2xl border border-violet-500/15 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <h2 class="font-display text-2xl font-bold text-gray-900 dark:text-white">FAQ</h2>
          <div class="mt-4 space-y-3">
            <article v-for="item in faq" :key="item.q" class="rounded-xl border border-violet-500/10 p-4 dark:border-white/10">
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ item.q }}</h3>
              <p class="mt-1.5 text-sm text-gray-700 dark:text-gray-200">{{ item.a }}</p>
            </article>
          </div>
        </div>

        <div class="mt-8">
          <a href="/#contact" class="btn-primary">Parler de votre projet</a>
        </div>
      </div>
    </div>
  </section>
</template>
