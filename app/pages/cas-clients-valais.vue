<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')
const localePath = useLocalePath()
const projectsStore = useProjectsStore()

await projectsStore.ensureLoaded()

const publishedCases = computed(() => (
  projectsStore.projects.filter(project => project.caseStudyPublished)
))

const faq = [
  {
    q: 'Combien coûte un site web en Valais ?',
    a: 'Le budget dépend du volume de pages, du niveau de personnalisation et des intégrations. Un cadrage court permet de chiffrer proprement.',
  },
  {
    q: 'En combien de temps un projet peut-il être livré ?',
    a: 'Pour un site vitrine standard, la livraison se fait souvent en quelques semaines selon le contenu disponible et le rythme de validation.',
  },
  {
    q: 'Le site est-il optimisé pour le SEO local ?',
    a: 'Oui. Structure technique, balises, performance, maillage interne et pages ciblées sont préparés pour un référencement local solide.',
  },
]

useSeoMeta({
  title: 'Cas clients | Développeur web en Valais - Antoine Quarroz',
  description: 'Études de cas web en Valais : contexte, approche, décisions techniques et résultats business pour indépendants, PME et startups.',
  ogTitle: 'Cas clients web en Valais - Antoine Quarroz',
  ogDescription: 'Retours concrets sur des projets web et mobile en Valais : objectifs, exécution et impact.',
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
      innerHTML: JSON.stringify({
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
          Des projets menés de bout en bout, avec une logique simple : clarifier l’offre, réduire la friction
          utilisateur et transformer le trafic en demandes qualifiées.
        </p>

        <div v-if="publishedCases.length" class="mt-10 grid gap-6 md:grid-cols-2">
          <article
            v-for="project in publishedCases"
            :key="project.id"
            class="group overflow-hidden rounded-3xl border border-violet-500/15 bg-white/70 shadow-lg shadow-violet-500/5 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <NuxtLink :to="localePath(`/projets/${project.slug}`)" class="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500">
              <img
                v-if="project.image"
                :src="project.image"
                alt=""
                class="aspect-[16/9] w-full object-cover outline outline-1 -outline-offset-1 outline-black/10 transition-transform duration-150 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none dark:outline-white/10"
                loading="lazy"
                decoding="async"
              >
              <div class="p-5 sm:p-6">
                <p v-if="project.clientLabel" class="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                  {{ project.clientLabel }}
                </p>
                <h2 class="font-display text-2xl font-bold text-gray-900 dark:text-white" :class="project.clientLabel ? 'mt-2' : ''">
                  {{ project.title }}
                </h2>
                <p class="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                  {{ project.description }}
                </p>
                <div v-if="project.tags.length" class="mt-5 flex flex-wrap gap-2">
                  <span
                    v-for="tag in project.tags"
                    :key="tag"
                    class="rounded-full border border-violet-500/15 px-3 py-1 text-xs text-violet-700 dark:border-violet-400/25 dark:text-violet-200"
                  >
                    {{ tag }}
                  </span>
                </div>
                <span class="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-violet-700 transition-colors group-hover:text-violet-500 dark:text-violet-200 dark:group-hover:text-white">
                  Lire l’étude de cas <span class="ml-2" aria-hidden="true">→</span>
                </span>
              </div>
            </NuxtLink>
          </article>
        </div>

        <div v-else class="mt-10 rounded-3xl border border-violet-500/15 bg-white/70 p-6 text-center dark:border-white/10 dark:bg-white/[0.04] sm:p-10">
          <h2 class="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Les prochaines études arrivent bientôt
          </h2>
          <p class="mx-auto mt-3 max-w-xl leading-relaxed text-gray-600 dark:text-gray-300">
            En attendant leur publication, découvrez les projets déjà présentés dans mon portfolio ou échangeons sur votre besoin.
          </p>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            <NuxtLink :to="localePath('/#portfolio')" class="btn-secondary">Voir le portfolio</NuxtLink>
            <NuxtLink :to="localePath('/#contact')" class="btn-primary">Parler de votre projet</NuxtLink>
          </div>
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
          <NuxtLink :to="localePath('/#contact')" class="btn-primary">Parler de votre projet</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
