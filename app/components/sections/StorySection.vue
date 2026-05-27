<script setup lang="ts">
const { locale } = useI18n()
const activeProject = ref(0)

const content = computed(() => {
  if (locale.value === 'en') {
    return {
      eyebrow: 'About / Studio',
      titleA: 'I build websites that look premium.',
      titleB: 'And sell like a top sales rep.',
      subtitle: 'I help founders and teams turn their digital presence into a growth channel with clear positioning, conversion-focused UX and robust engineering.',
      claim: 'Brand strategy. Product design. High-performance delivery.',
      rows: [
        { k: 'Experience', v: '3+ years building premium digital products' },
        { k: 'Projects',   v: '20+ delivered web and mobile projects' },
        { k: 'Approach',   v: 'Fast cycles, clear roadmap, measurable outcomes' },
      ],
      ctaA: 'Explore portfolio', ctaB: 'Book a call',
      proofA: 'Conversion-first', proofB: 'SEO + speed', proofC: 'Scalable CMS',
      sell: 'What you really buy', sellDesc: 'A digital system designed to turn visitors into qualified leads.',
      stack: 'Core stack', based: 'Swiss based',
      projectsLabel: 'Projects', speedLabel: 'Lighthouse', protoLabel: 'Prototype', days: '3d',
      pitch: 'Have a project?', pitchCta: "Let's talk →",
      nav: ['Portfolio', 'Services', 'Blog', 'Contact'],
      terminalTitle: 'About me / Terminal session',
      terminalIntro: 'Hi, I’m Antoine Quarroz — web developer and mediamatician based in Switzerland.',
      terminalLines: [
        '$ whoami',
        'antoine-quarroz --role "web-mobile-engineer"',
        'base: valais, switzerland | status: independent freelancer',
        '$ cat approach.md',
        'I combine development, UI design, digital communication and user experience.',
        '$ cat mission.txt',
        'Turn ideas into concrete, useful and modern digital products.',
        '$ ls projects/',
      ],
      aboutParagraphs: [
        'For several years, I have worked on projects mixing websites, apps, interface design, video and interactive tools.',
        'My goal is simple: help independents, companies and institutions build solutions that are clear, fast and genuinely useful.',
      ],
      processTitle: 'How I work',
      process: ['Listen', 'Understand', 'Propose', 'Build', 'Improve'],
      quickFacts: [
        { key: 'Location', value: 'Valais, Switzerland' },
        { key: 'Specialty', value: 'Conversion-first web experiences' },
        { key: 'Delivery', value: 'Fast cycle, measurable outcomes' },
      ],
      projects: [
        {
          type: 'Web Platform',
          title: 'Premium Lead Engine',
          desc: 'Strategic website with clear offer architecture, high trust UI and faster loading times.',
          image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1400&q=80',
          stack: ['Nuxt 3', 'TypeScript', 'Supabase'],
        },
        {
          type: 'Mobile App',
          title: 'Client Portal',
          desc: 'Mobile-first customer area with smooth flows, booking and personalized notifications.',
          image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1400&q=80',
          stack: ['Flutter', 'Supabase', 'PostgreSQL'],
        },
        {
          type: 'CMS & Growth',
          title: 'Content Machine',
          desc: 'Editorial back-office built for speed, SEO consistency and autonomous publishing.',
          image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80',
          stack: ['Nuxt', 'Tailwind', 'Analytics'],
        },
      ],
    }
  }
  if (locale.value === 'de') {
    return {
      eyebrow: 'Über mich / Studio',
      titleA: 'Ich entwickle Websites mit Premium-Auftritt.',
      titleB: 'Und mit echter Vertriebswirkung.',
      subtitle: 'Ich unterstütze Unternehmen dabei, ihre digitale Präsenz in einen echten Wachstumskanal zu verwandeln.',
      claim: 'Brand-Strategie. Produktdesign. Performance Delivery.',
      rows: [
        { k: 'Erfahrung', v: '3+ Jahre mit hochwertigen Digitalprojekten' },
        { k: 'Projekte',  v: '20+ ausgelieferte Web- und Mobile-Projekte' },
        { k: 'Ansatz',    v: 'Schnelle Iterationen, klare Roadmap, messbare Ergebnisse' },
      ],
      ctaA: 'Portfolio ansehen', ctaB: 'Gespräch starten',
      proofA: 'Conversion-Architektur', proofB: 'SEO + Speed', proofC: 'Skalierbares CMS',
      sell: 'Was Sie kaufen', sellDesc: 'Ein digitales System, das Besucher in qualifizierte Leads umwandelt.',
      stack: 'Technologie', based: 'Standort Schweiz',
      projectsLabel: 'Projekte', speedLabel: 'Lighthouse', protoLabel: 'Prototyp', days: '3T',
      pitch: 'Projektidee?', pitchCta: 'Besprechen →',
      nav: ['Portfolio', 'Services', 'Blog', 'Kontakt'],
      terminalTitle: 'Über mich / Terminal Session',
      terminalIntro: 'Hi, ich bin Antoine Quarroz — Webentwickler und Mediamatiker aus der Schweiz.',
      terminalLines: [
        '$ whoami',
        'antoine-quarroz --rolle "web-mobile-engineer"',
        'base: wallis, schweiz | status: freelancer',
        '$ cat approach.md',
        'Ich kombiniere Entwicklung, UI-Design, digitale Kommunikation und UX.',
        '$ cat mission.txt',
        'Ideen in konkrete, nützliche und moderne digitale Produkte verwandeln.',
        '$ ls projects/',
      ],
      aboutParagraphs: [
        'Seit mehreren Jahren arbeite ich an Projekten rund um Websites, Apps, Interface-Design, Video und interaktive Tools.',
        'Mein Ziel: Selbständige, Unternehmen und Institutionen mit klaren, schnellen und wirklich nützlichen Lösungen unterstützen.',
      ],
      processTitle: 'Arbeitsweise',
      process: ['Zuhören', 'Verstehen', 'Vorschlagen', 'Umsetzen', 'Optimieren'],
      quickFacts: [
        { key: 'Standort', value: 'Wallis, Schweiz' },
        { key: 'Fokus', value: 'Conversion-orientierte digitale Produkte' },
        { key: 'Delivery', value: 'Schnelle Iterationen, klare KPIs' },
      ],
      projects: [
        {
          type: 'Web Plattform',
          title: 'Premium Lead Engine',
          desc: 'Strategische Website mit klarer Angebotsstruktur, Vertrauen und hoher Performance.',
          image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1400&q=80',
          stack: ['Nuxt 3', 'TypeScript', 'Supabase'],
        },
        {
          type: 'Mobile App',
          title: 'Client Portal',
          desc: 'Mobiler Kundenbereich mit reibungslosen Flows, Terminbuchung und Notifications.',
          image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1400&q=80',
          stack: ['Flutter', 'Supabase', 'PostgreSQL'],
        },
        {
          type: 'CMS & Growth',
          title: 'Content Machine',
          desc: 'Content-Backoffice für schnelle Publikation und stabile SEO-Performance.',
          image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80',
          stack: ['Nuxt', 'Tailwind', 'Analytics'],
        },
      ],
    }
  }
  return {
    eyebrow: 'Qui je suis / Studio',
    titleA: 'Je crée des sites premium qui marquent.',
    titleB: 'Et qui vendent vraiment.',
    subtitle: "J'aide les marques et indépendants à transformer leur présence digitale en levier business avec un positionnement clair, un design orienté conversion et une exécution technique solide.",
    claim: 'Positionnement. Design produit. Performance. Conversion.',
    rows: [
      { k: 'Expérience', v: '3+ ans sur des produits digitaux premium' },
      { k: 'Projets',    v: '20+ projets livrés en web et mobile' },
      { k: 'Approche',   v: 'Cycles rapides, plan clair, résultats mesurables' },
    ],
    ctaA: 'Voir le portfolio', ctaB: 'Réserver un appel',
    proofA: 'Orienté conversion', proofB: 'SEO + vitesse', proofC: 'CMS scalable',
    sell: 'Ce que tu achètes', sellDesc: 'Un système digital conçu pour convertir les visiteurs en demandes qualifiées.',
    stack: 'Stack clé', based: 'Basé en Suisse',
    projectsLabel: 'Projets', speedLabel: 'Lighthouse', protoLabel: 'Prototype', days: '3j',
    pitch: 'Un projet en tête ?', pitchCta: 'Discuter →',
    nav: ['Portfolio', 'Services', 'Blog', 'Contact'],
    terminalTitle: 'À propos / Session terminal',
    terminalIntro: "Salut, moi c'est Antoine Quarroz — développeur web et médiamaticien basé en Suisse.",
    terminalLines: [
      '$ whoami',
      'antoine-quarroz --role "web-mobile-engineer"',
      'base: valais, suisse | statut: freelance indépendant',
      '$ cat approche.md',
      "Je combine développement, design d'interface, communication digitale et expérience utilisateur.",
      '$ cat mission.txt',
      'Transformer des idées en solutions digitales concrètes, modernes et utiles.',
      '$ ls projets/',
    ],
    aboutParagraphs: [
      "Depuis plusieurs années, je travaille sur des projets mêlant développement web, applications, design d'interface, vidéo et outils interactifs.",
      "Mon objectif est simple : aider les indépendants, entreprises et institutions à créer des solutions claires, rapides et pensées pour les besoins réels.",
    ],
    processTitle: 'Ma façon de travailler',
    process: ['Écouter', 'Comprendre', 'Proposer', 'Créer', 'Améliorer'],
    quickFacts: [
      { key: 'Base', value: 'Valais, Suisse' },
      { key: 'Spécialité', value: 'Expériences web qui génèrent des leads' },
      { key: 'Méthode', value: 'Cycles rapides, plan clair, résultats mesurables' },
    ],
    projects: [
      {
        type: 'Plateforme Web',
        title: 'Premium Lead Engine',
        desc: 'Site stratégique avec architecture d’offre claire, UI de confiance et performance solide.',
        image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1400&q=80',
        stack: ['Nuxt 3', 'TypeScript', 'Supabase'],
      },
      {
        type: 'Application Mobile',
        title: 'Client Portal',
        desc: 'Espace client mobile-first avec parcours fluides, réservation et notifications ciblées.',
        image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1400&q=80',
        stack: ['Flutter', 'Supabase', 'PostgreSQL'],
      },
      {
        type: 'CMS & Growth',
        title: 'Content Machine',
        desc: 'Back-office éditorial conçu pour publier vite, tenir le SEO et scaler facilement.',
        image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80',
        stack: ['Nuxt', 'Tailwind', 'Analytics'],
      },
    ],
  }
})

// ════════════════════════════════════════════════════════════════════════
//  SCROLL ANIMATION — dimensions définies en % viewport (pas de DOM)
// ════════════════════════════════════════════════════════════════════════
const { width: vw, height: vh } = useWindowSize()

const deviceW = computed(() => Math.min(0.88 * vw.value, 1140))
const deviceH = computed(() => 0.72 * vh.value)

const fillScale = computed(() => {
  if (!import.meta.client) return 1.4
  return Math.max(vw.value / deviceW.value, vh.value / deviceH.value)
})

const deviceZoneRef = ref<HTMLElement | null>(null)
const { top: zoneTop, height: zoneHeight } = useElementBounding(deviceZoneRef)

const zoomProgress = computed(() => {
  if (!import.meta.client) return 0
  const scrolled   = Math.max(0, -zoneTop.value)
  const scrollable = Math.max(1, zoneHeight.value - vh.value)
  return Math.min(1, scrolled / scrollable)
})

// 3 phases:
// 1) lock scene and show full-screen content
// 2) animate iPad reveal
// 3) keep final iPad centered for extra scroll before leaving section
const INTRO_HOLD = 0.16
const REVEAL_END = 0.42
function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4) }
const revealProgress = computed(() => {
  const p = zoomProgress.value
  if (p <= INTRO_HOLD) return 0
  if (p >= REVEAL_END) return 1
  return (p - INTRO_HOLD) / (REVEAL_END - INTRO_HOLD)
})
const ep = computed(() => easeOutQuart(revealProgress.value))

const scale = computed(() => fillScale.value + (1 - fillScale.value) * ep.value)

const deviceStyle = computed(() => ({
  width:           `${deviceW.value}px`,
  height:          `${deviceH.value}px`,
  transform:       `scale(${scale.value})`,
  transformOrigin: 'center center',
  willChange:      'transform',
}))

const frameStyle = computed(() => ({
  borderRadius:    `${Math.round(42 * ep.value)}px`,
  backgroundColor: `rgba(11,14,24,${ep.value})`,
  borderColor:     `rgba(97,113,148,${0.78 * ep.value})`,
  boxShadow:       `0 0 0 1px rgba(255,255,255,${0.05 * ep.value}), 0 50px 140px rgba(0,0,0,${0.72 * ep.value}), 0 0 100px rgba(29,122,255,${0.14 * ep.value})`,
}))

const barStyle = computed(() => ({
  height:     `${Math.round(40 * Math.min(1, ep.value * 2.5))}px`,
  opacity:    Math.max(0, (ep.value - 0.2) / 0.8),
  overflow:   'hidden',
  flexShrink: '0',
}))

const screenRadius = computed(() => `${Math.round(28 * ep.value)}px`)
const chromeOpacity = computed(() => Math.min(1, ep.value * 2))
const bgGlow = computed(() => ep.value)
const hintOpacity = computed(() => {
  if (zoomProgress.value < INTRO_HOLD * 0.7) return 1
  return Math.max(0, 1 - ep.value * 8)
})
</script>

<template>
  <section class="relative overflow-hidden bg-black">

    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute inset-0 bg-[linear-gradient(155deg,#04040b_0%,#070712_44%,#090c1c_100%)]" />
      <div class="absolute -top-24 left-[8%] w-72 h-72 rounded-full bg-violet-500/30 blur-3xl" />
      <div class="absolute -bottom-20 right-[10%] w-80 h-80 rounded-full bg-cyan-400/20 blur-3xl" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_52%_78%,rgba(99,102,241,0.1),transparent_50%)]" />
      <div class="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.05),transparent_22%,transparent_74%,rgba(0,0,0,0.25))]" />
      <div class="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.35),transparent_45%,rgba(0,0,0,0.12))]" />
      <div
        class="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[30rem] rounded-full blur-[130px] pointer-events-none"
        :style="{ background: `rgba(124,58,237,${0.08 + bgGlow * 0.15})` }"
      />
      <div
        class="absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[20rem] rounded-full blur-[95px] pointer-events-none"
        :style="{ background: `rgba(34,211,238,${bgGlow * 0.08})` }"
      />
    </div>

    <div ref="deviceZoneRef" class="relative" style="height: 105vh">
      <div class="sticky top-0 h-screen overflow-hidden flex items-center justify-center">

        <div class="relative z-10" :style="deviceStyle">

          <div
            class="h-full w-full flex flex-col border-[2px] overflow-hidden relative"
            :style="frameStyle"
          >
            <!-- Caméra top bezel -->
            <div class="flex-shrink-0 flex items-center justify-center" style="height: 24px" :style="{ opacity: chromeOpacity }">
              <div class="w-14 h-[14px] rounded-full bg-zinc-800/90 flex items-center justify-center gap-1.5">
                <div class="w-1.5 h-1.5 rounded-full bg-zinc-600/80 ring-1 ring-zinc-500/40" />
                <div class="w-1 h-1 rounded-full bg-zinc-700/60" />
              </div>
            </div>

            <!-- Browser bar macOS -->
            <div class="w-full flex items-center gap-2.5 px-3.5 bg-[#0c1120]/95 border-b border-white/[0.08] flex-shrink-0" :style="barStyle">
              <div class="flex gap-1.5 flex-shrink-0">
                <div class="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div class="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <div class="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
              <div class="flex-1 mx-2 rounded-md bg-[#1a2133]/90 border border-white/[0.08] h-[22px] flex items-center gap-1.5 px-2.5">
                <svg class="w-2.5 h-2.5 text-violet-300 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.25"/>
                  <path d="M8 1.5C6.5 3.5 5.5 5.7 5.5 8s1 4.5 2.5 6.5M8 1.5C9.5 3.5 10.5 5.7 10.5 8s-1 4.5-2.5 6.5M1.5 8h13" stroke="currentColor" stroke-width="1.25"/>
                </svg>
                <span class="text-[10px] text-zinc-300/90 truncate">antoinequarroz.ch</span>
              </div>
            </div>

            <!-- Écran -->
            <div
              class="flex-1 overflow-hidden bg-gradient-to-br from-[#f9fbff] via-[#f2f7ff] to-[#ebf5ff] dark:from-[#111a30] dark:via-[#132240] dark:to-[#0f1b31]"
              :style="{ borderRadius: screenRadius }"
            >
              <div class="absolute inset-0 pointer-events-none z-20"
                :style="{ background: `linear-gradient(135deg, rgba(255,255,255,${0.06 * ep}) 0%, transparent 50%)`, borderRadius: screenRadius }"
              />
              <div class="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(circle_at_80%_10%,rgba(18,153,255,0.15),transparent_35%)]" :style="{ borderRadius: screenRadius }" />

              <div class="relative h-full z-10 p-2.5 sm:p-4 md:p-6 flex flex-col gap-2.5 md:gap-3">

                <!-- Nav mockée -->
                <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-white/88 dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.09] backdrop-blur flex-shrink-0 shadow-[0_4px_18px_rgba(15,23,42,0.08)]">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-sm flex-shrink-0">
                      <span class="text-[9px] font-bold text-white leading-none">AQ</span>
                    </div>
                    <span class="text-xs font-semibold text-gray-800 dark:text-white/90 hidden sm:block">Antoine Quarroz</span>
                  </div>
                  <div class="hidden md:flex items-center gap-3.5">
                    <span v-for="link in content.nav.slice(0,3)" :key="link" class="text-[10px] text-gray-500 dark:text-white/45">{{ link }}</span>
                    <span class="text-[10px] px-2.5 py-1 rounded-full bg-[#171a36] text-violet-100 font-medium shadow-sm">{{ content.nav[3] }}</span>
                  </div>
                </div>

                <!-- Terminal interactif dans l'iPad -->
                <div class="flex-1 grid lg:grid-cols-12 gap-3 md:gap-4 min-h-0">
                  <div class="lg:col-span-5 rounded-2xl border border-violet-400/20 bg-[#0b1026] overflow-hidden min-h-0 shadow-[0_12px_40px_rgba(20,13,55,0.5)]">
                    <div class="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.08] bg-[#0f1632]">
                      <div class="w-2 h-2 rounded-full bg-[#ff5f57]" />
                      <div class="w-2 h-2 rounded-full bg-[#febc2e]" />
                      <div class="w-2 h-2 rounded-full bg-[#28c840]" />
                      <span class="ml-2 text-xs text-violet-100/75 font-mono">about.sh</span>
                    </div>
                    <div class="p-3.5 md:p-4 h-full flex flex-col min-h-0">
                      <div class="space-y-2.5 rounded-xl border border-violet-300/20 bg-[#090d21] p-3.5">
                        <p v-for="line in content.terminalLines" :key="line" class="text-sm text-violet-100/92 font-mono leading-relaxed">
                          <span v-if="line.startsWith('$')" class="text-fuchsia-300">{{ line }}</span>
                          <span v-else>{{ line }}</span>
                        </p>
                      </div>
                      <div class="mt-3 space-y-2 overflow-auto no-scrollbar">
                        <p v-for="paragraph in content.aboutParagraphs" :key="paragraph" class="text-sm text-white/82 leading-relaxed">
                          {{ paragraph }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div class="lg:col-span-7 flex flex-col gap-3 md:gap-4 min-h-0">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        v-for="(project, idx) in content.projects"
                        :key="project.title"
                        type="button"
                        class="text-left rounded-xl border px-3 py-2.5 transition-all"
                        :class="idx === activeProject
                          ? 'border-violet-300/60 bg-violet-400/15 shadow-[0_0_0_1px_rgba(196,181,253,0.15)]'
                          : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-violet-300/35'"
                        @click="activeProject = idx"
                      >
                        <p class="text-[10px] uppercase tracking-[0.12em] text-violet-300/90">{{ project.type }}</p>
                        <p class="text-sm text-white/90 mt-1 font-semibold truncate">{{ project.title }}</p>
                      </button>
                    </div>

                    <div class="rounded-2xl border border-violet-300/20 bg-[#111735] overflow-hidden">
                      <div class="aspect-[16/7]">
                        <img
                          :src="content.projects[activeProject].image"
                          :alt="content.projects[activeProject].title"
                          class="w-full h-full object-cover"
                        >
                      </div>
                      <div class="p-4 md:p-5 grid md:grid-cols-[1fr_auto] gap-4 items-start">
                        <p class="text-sm text-white/82 leading-relaxed">{{ content.projects[activeProject].desc }}</p>
                        <div class="flex flex-wrap gap-1.5 md:max-w-[210px]">
                          <span v-for="tag in content.projects[activeProject].stack" :key="tag" class="text-[10px] px-2.5 py-1 rounded-full bg-violet-400/15 text-violet-100 border border-violet-300/20">
                            {{ tag }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="grid md:grid-cols-2 gap-3">
                      <div class="rounded-2xl border border-violet-300/20 bg-white/[0.06] p-3.5">
                        <p class="text-[10px] uppercase tracking-[0.14em] text-violet-300">{{ content.sell }}</p>
                        <p class="mt-2 text-xs text-white/74 leading-relaxed">{{ content.sellDesc }}</p>
                        <div class="mt-2.5 space-y-1 text-[11px] text-white/68">
                          <p>• Positionnement clair</p>
                          <p>• UX orientée conversion</p>
                          <p>• Base technique scalable</p>
                        </div>
                      </div>
                      <div class="rounded-2xl border border-violet-300/20 bg-gradient-to-br from-[#201147] via-[#2a1b64] to-[#243f9e] p-3.5 text-white">
                        <p class="text-[10px] uppercase tracking-[0.14em] text-violet-200/85">{{ content.processTitle }}</p>
                        <div class="mt-2 flex flex-wrap gap-1.5">
                          <span v-for="step in content.process" :key="step" class="text-[10px] px-2.5 py-1 rounded-full bg-white/12 border border-white/20">
                            {{ step }}
                          </span>
                        </div>
                        <a href="/#contact" class="mt-3 inline-block text-xs font-semibold underline underline-offset-4 opacity-90">{{ content.pitchCta }}</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Home bar bottom bezel -->
            <div class="flex-shrink-0 flex items-center justify-center" style="height: 20px" :style="{ opacity: chromeOpacity }">
              <div class="w-28 h-[3px] rounded-full bg-white/25" />
            </div>
          </div>

          <!-- Ombre portée -->
          <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"
            :style="{ width: '70%', height: '40px', background: `radial-gradient(ellipse, rgba(35,115,255,${0.35 * ep}), transparent 70%)`, filter: 'blur(12px)' }"
          />
        </div>

        <!-- Hint scroll -->
        <div class="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none select-none" :style="{ opacity: hintOpacity }">
          <span class="text-[9px] tracking-[0.3em] uppercase text-white/30">Scroll</span>
          <svg class="w-3 h-3 text-white/20 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>

  </section>
</template>
