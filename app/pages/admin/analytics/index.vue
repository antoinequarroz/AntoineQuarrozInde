<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

type TrendPoint = { date: string, visitors: number, pageviews: number }
type SourcePoint = { source: string, visitors: number, visits: number }

const auth = useAuthStore()
const data = ref<any>(null)
const plausible = ref<any>(null)
const pending = ref(false)
const loadError = ref('')

const sourceColors = ['#7c3aed', '#22d3ee', '#a78bfa', '#0891b2', '#c4b5fd', '#67e8f9', '#6d28d9', '#0e7490']

async function loadAnalytics() {
  pending.value = true
  loadError.value = ''
  try {
    const headers = auth.authHeader()
    const [internal, external] = await Promise.all([
      $fetch('/api/admin/marketing-analytics', { headers }),
      $fetch('/api/admin/plausible-stats', { headers }),
    ])
    data.value = internal
    plausible.value = external
  }
  catch {
    loadError.value = 'Les statistiques n’ont pas pu être chargées. Réessaie dans quelques instants.'
  }
  finally { pending.value = false }
}

const labels: Record<string, string> = {
  hero_view: 'Visites de la landing page',
  hero_cta_primary_click: 'Clics CTA principal',
  hero_cta_secondary_click: 'Clics portfolio',
  services_cta_click: 'Clics services',
  booking_calendar_click: 'Ouvertures du calendrier',
  booking_fallback_click: 'Demandes de rendez-vous',
  project_case_study_view: 'Études de cas consultées',
  project_case_study_click: 'Clics études de cas',
  project_live_click: 'Clics vers les projets en ligne',
  project_code_click: 'Clics vers le code',
  contact_email_click: 'Clics e-mail',
  contact_form_submit_success: 'Formulaires envoyés',
  contact_form_submit_error: 'Erreurs formulaire',
}

const audienceMetrics = computed(() => plausible.value?.totals ? [
  { label: 'Visiteurs uniques', value: plausible.value.totals.visitors, tone: 'violet' },
  { label: 'Visites', value: plausible.value.totals.visits, tone: 'cyan' },
  { label: 'Pages vues', value: plausible.value.totals.pageviews, tone: 'violet' },
  { label: 'Taux de rebond', value: `${plausible.value.totals.bounceRate} %`, tone: 'cyan' },
  { label: 'Durée moyenne', value: formatDuration(plausible.value.totals.visitDuration), tone: 'violet' },
] : [])

const internalMetrics = computed(() => data.value ? [
  { label: 'Visites landing', value: data.value.totals.views },
  { label: 'Clics contact', value: data.value.totals.primaryClicks },
  { label: 'Calendrier', value: data.value.totals.bookingClicks },
  { label: 'Projets consultés', value: data.value.totals.projectViews },
  { label: 'Demandes reçues', value: data.value.totals.contactSuccess },
  { label: 'Conversion', value: `${data.value.rates.heroToContact} %` },
] : [])

const hasTrendData = computed(() => Boolean(plausible.value?.trend?.length >= 2 && (plausible.value?.totals?.visitors || plausible.value?.totals?.pageviews)))
const hasExperimentData = computed(() => Boolean(data.value?.variants?.some((variant: any) => variant.views > 0)))

const trendChart = computed(() => {
  const rows = (plausible.value?.trend || []) as TrendPoint[]
  const width = 760
  const height = 260
  const left = 44
  const right = 18
  const top = 22
  const bottom = 42
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const maxValue = Math.max(1, ...rows.flatMap(row => [row.visitors, row.pageviews]))
  const x = (index: number) => left + (rows.length <= 1 ? plotWidth / 2 : index / (rows.length - 1) * plotWidth)
  const y = (value: number) => top + plotHeight - value / maxValue * plotHeight
  const toPoints = (key: 'visitors' | 'pageviews') => rows.map((row, index) => `${x(index)},${y(row[key])}`).join(' ')
  const tickIndexes = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])].filter(index => index >= 0)
  return {
    rows, width, height, left, top, plotWidth, plotHeight, maxValue,
    visitorPoints: toPoints('visitors'),
    pageviewPoints: toPoints('pageviews'),
    ticks: tickIndexes.map(index => ({ x: x(index), label: formatDate(rows[index]?.date) })),
    points: rows.map((row, index) => ({ ...row, x: x(index), visitorsY: y(row.visitors), pageviewsY: y(row.pageviews) })),
    grid: [0, 0.5, 1].map(ratio => ({ y: top + plotHeight * ratio, label: Math.round(maxValue * (1 - ratio)) })),
  }
})

const sourceChart = computed(() => {
  const sources = (plausible.value?.sources || []) as SourcePoint[]
  const total = sources.reduce((sum, source) => sum + source.visitors, 0)
  let cursor = 0
  const segments = sources.map((source, index) => {
    const percentage = total ? source.visitors / total * 100 : 0
    const start = cursor
    cursor += percentage
    return { ...source, percentage, color: sourceColors[index % sourceColors.length], start, end: cursor }
  })
  const background = segments.length
    ? `conic-gradient(${segments.map(segment => `${segment.color} ${segment.start}% ${segment.end}%`).join(', ')})`
    : 'conic-gradient(#f7f8ff 0 100%)'
  return { total, segments, background }
})

const funnelSteps = computed(() => {
  if (!data.value) return []
  const steps = [
    { label: 'Landing consultée', value: data.value.totals.views, color: '#7c3aed' },
    { label: 'Intérêt pour le contact', value: data.value.totals.primaryClicks, color: '#a78bfa' },
    { label: 'Calendrier ouvert', value: data.value.totals.bookingClicks, color: '#22d3ee' },
    { label: 'Demande envoyée', value: data.value.totals.contactSuccess, color: '#22d3ee' },
  ]
  const max = Math.max(1, ...steps.map(step => step.value))
  return steps.map((step, index) => {
    const previousValue = index > 0 ? Number(steps[index - 1]?.value || 0) : 0
    return {
      ...step,
      width: step.value ? Math.max(8, step.value / max * 100) : 0,
      rate: previousValue ? Math.round(step.value / previousValue * 1000) / 10 : null,
    }
  })
})

function formatDate(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-CH', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`))
}

function formatDuration(seconds: number) {
  if (!seconds) return '0 s'
  if (seconds < 60) return `${Math.round(seconds)} s`
  return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`
}

onMounted(loadAnalytics)
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Performance commerciale</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Audience, acquisition et conversion sur les 30 derniers jours.</p>
        </div>
        <button class="min-h-11 rounded-lg bg-gray-100 px-4 text-sm font-semibold transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait disabled:opacity-60 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]" :disabled="pending" @click="loadAnalytics">
          {{ pending ? 'Actualisation…' : 'Rafraîchir' }}
        </button>
      </div>
    </section>

    <div v-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
      {{ loadError }}
    </div>

    <div v-if="pending && !data" class="grid min-h-72 place-items-center rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="text-center"><div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /><p class="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement des statistiques…</p></div>
    </div>

    <template v-if="data">
      <section class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]" aria-labelledby="plausible-title">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
          <div><h2 id="plausible-title" class="font-display text-lg font-semibold">Audience Plausible</h2><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Mesure respectueuse de la vie privée, journée en cours incluse.</p></div>
          <a :href="`https://plausible.io/${plausible?.siteId || 'antoinequarroz.ch'}`" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center text-sm font-semibold text-violet-600 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-300">Ouvrir Plausible ↗</a>
        </div>

        <div v-if="plausible?.totals" class="grid grid-cols-2 divide-x divide-y divide-gray-100 lg:grid-cols-5 lg:divide-y-0 dark:divide-white/[0.06]">
          <div v-for="(metric, index) in audienceMetrics" :key="metric.label" class="px-4 py-3 lg:px-5 lg:py-4" :class="index === audienceMetrics.length - 1 ? 'col-span-2 lg:col-span-1' : ''">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ metric.label }}</p>
            <p class="mt-1 font-display text-2xl font-semibold text-gray-950 dark:text-white">{{ metric.value }}</p>
          </div>
        </div>

        <div v-else class="m-5 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-white/[0.12] dark:text-gray-400">
          <span v-if="plausible?.unavailable">Plausible est configuré mais les statistiques sont temporairement indisponibles.</span>
          <span v-else>La clé Stats API doit être configurée sur le VPS. Le suivi public reste actif.</span>
        </div>
      </section>

      <section v-if="plausible?.totals" class="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <article class="min-w-0 rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div><h2 class="font-display text-lg font-semibold">Évolution de l’audience</h2><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Visiteurs uniques et pages vues par jour.</p></div>
            <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400"><span class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full" style="background-color:#7c3aed" />Visiteurs</span><span class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full" style="background-color:#22d3ee" />Pages vues</span></div>
          </div>
          <div v-if="hasTrendData" class="mt-5" role="img" :aria-label="`Courbe sur 30 jours : ${plausible.totals.visitors} visiteurs et ${plausible.totals.pageviews} pages vues`">
            <svg class="audience-chart" :viewBox="`0 0 ${trendChart.width} ${trendChart.height}`" aria-hidden="true">
              <g v-for="line in trendChart.grid" :key="line.y">
                <line :x1="trendChart.left" :x2="trendChart.left + trendChart.plotWidth" :y1="line.y" :y2="line.y" class="stroke-gray-200 dark:stroke-white/[0.08]" stroke-dasharray="3 5" />
                <text :x="trendChart.left - 10" :y="line.y + 4" text-anchor="end" class="fill-gray-400 text-xs">{{ line.label }}</text>
              </g>
              <defs><linearGradient id="audience-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3aed" stop-opacity="0.18" /><stop offset="1" stop-color="#7c3aed" stop-opacity="0" /></linearGradient></defs>
              <polygon v-if="trendChart.rows.length" :points="`${trendChart.left},${trendChart.top + trendChart.plotHeight} ${trendChart.visitorPoints} ${trendChart.left + trendChart.plotWidth},${trendChart.top + trendChart.plotHeight}`" fill="url(#audience-area)" />
              <polyline v-if="trendChart.rows.length" :points="trendChart.visitorPoints" fill="none" stroke="#7c3aed" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="chart-line" />
              <polyline v-if="trendChart.rows.length" :points="trendChart.pageviewPoints" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chart-line chart-line-secondary" />
              <g v-for="point in trendChart.points.filter(point => point.visitors || point.pageviews)" :key="point.date">
                <circle :cx="point.x" :cy="point.visitorsY" r="4" fill="#7c3aed"><title>{{ formatDate(point.date) }} : {{ point.visitors }} visiteurs</title></circle>
                <circle :cx="point.x" :cy="point.pageviewsY" r="3.5" fill="#06b6d4"><title>{{ formatDate(point.date) }} : {{ point.pageviews }} pages vues</title></circle>
              </g>
              <text v-for="tick in trendChart.ticks" :key="tick.x" :x="tick.x" :y="trendChart.height - 12" text-anchor="middle" class="fill-gray-400 text-xs">{{ tick.label }}</text>
            </svg>
            <table class="sr-only">
              <caption>Audience quotidienne sur les 30 derniers jours</caption>
              <thead><tr><th>Date</th><th>Visiteurs</th><th>Pages vues</th></tr></thead>
              <tbody><tr v-for="point in trendChart.rows" :key="`accessible-${point.date}`"><td>{{ formatDate(point.date) }}</td><td>{{ point.visitors }}</td><td>{{ point.pageviews }}</td></tr></tbody>
            </table>
          </div>
          <div v-else class="mt-5 grid min-h-48 place-items-center rounded-lg border border-dashed border-gray-200 p-6 text-center dark:border-white/[0.1]"><div><p class="font-medium">Historique en cours de constitution</p><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">La courbe apparaîtra dès les premières visites mesurées.</p></div></div>
        </article>

        <article class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]">
          <h2 class="font-display text-lg font-semibold">Origine des visiteurs</h2>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Répartition par source d’acquisition.</p>
          <div v-if="sourceChart.segments.length" class="mt-6 grid items-center gap-6 sm:grid-cols-[160px_1fr] xl:grid-cols-1">
            <div class="relative mx-auto h-40 w-40 rounded-full" :style="{ background: sourceChart.background }" role="img" :aria-label="`${sourceChart.total} visiteurs répartis sur ${sourceChart.segments.length} sources`">
              <div class="absolute inset-7 grid place-items-center rounded-full bg-white text-center dark:bg-[#111118]"><div><strong class="font-display text-2xl">{{ sourceChart.total }}</strong><p class="text-xs text-gray-500 dark:text-gray-400">visiteurs</p></div></div>
            </div>
            <div class="space-y-3">
              <div v-for="segment in sourceChart.segments" :key="segment.source" class="flex items-center gap-3 text-sm">
                <i class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: segment.color }" />
                <span class="min-w-0 flex-1 truncate text-gray-600 dark:text-gray-300">{{ segment.source }}</span>
                <strong>{{ segment.visitors }}</strong>
                <span class="w-10 text-right text-xs text-gray-400">{{ Math.round(segment.percentage) }} %</span>
              </div>
            </div>
          </div>
          <p v-else class="mt-8 rounded-lg border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500 dark:border-white/[0.1] dark:text-gray-400">Les sources apparaîtront dès les prochaines visites.</p>
        </article>
      </section>

      <section class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]"><h2 class="font-display text-lg font-semibold">Actions sur le site</h2><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Événements internes utiles pour comprendre le parcours.</p></div>
        <div class="grid divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-6 dark:divide-white/[0.06]">
          <div v-for="metric in internalMetrics" :key="metric.label" class="px-4 py-4"><p class="text-xs text-gray-500 dark:text-gray-400">{{ metric.label }}</p><p class="mt-1 font-display text-xl font-semibold">{{ metric.value }}</p></div>
        </div>
      </section>

      <section class="grid gap-5 lg:grid-cols-2">
        <article class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]">
          <h2 class="font-display text-lg font-semibold">Entonnoir de conversion</h2>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">De la découverte à la demande de contact.</p>
          <div class="mt-6 space-y-5">
            <div v-for="step in funnelSteps" :key="step.label">
              <div class="mb-2 flex items-center justify-between gap-3 text-sm"><span class="font-medium text-gray-700 dark:text-gray-200">{{ step.label }}</span><div class="flex items-center gap-3"><span v-if="step.rate !== null" class="text-xs text-gray-400">{{ step.rate }} % de l’étape précédente</span><strong>{{ step.value }}</strong></div></div>
              <div class="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.07]"><div class="h-full rounded-full transition-[width] duration-700 ease-out" :style="{ width: `${step.width}%`, backgroundColor: step.color }" /></div>
            </div>
          </div>
        </article>

        <article class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]">
          <h2 class="font-display text-lg font-semibold">Test du message d’accueil</h2>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Comparaison des variantes A et B du hero.</p>
          <div v-if="hasExperimentData" class="mt-6 space-y-5">
            <div v-for="variant in data.variants" :key="variant.variant">
              <div class="mb-2 flex items-end justify-between gap-3"><div><p class="text-sm font-semibold">Version {{ variant.variant }}</p><p class="text-xs text-gray-500 dark:text-gray-400">{{ variant.clicks }} clics sur {{ variant.views }} vues</p></div><strong class="font-display text-2xl">{{ variant.conversionRate }} %</strong></div>
              <div class="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.07]"><div class="h-full rounded-full bg-violet-600 transition-[width] duration-700 ease-out" :style="{ width: `${Math.min(100, variant.conversionRate)}%` }" /></div>
            </div>
          </div>
          <div v-else class="mt-6 grid min-h-40 place-items-center rounded-lg border border-dashed border-gray-200 p-5 text-center dark:border-white/[0.1]"><div><p class="font-medium">Aucune comparaison disponible</p><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Les variantes seront comparées après leurs premières visites.</p></div></div>
          <p class="mt-6 text-xs leading-relaxed text-gray-500 dark:text-gray-400">Une tendance devient exploitable lorsque chaque version dispose d’un volume de visites suffisant.</p>
        </article>
      </section>

      <section v-if="data.byEvent.length" class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]">
        <h2 class="font-display text-lg font-semibold">Détail des événements</h2>
        <div class="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="row in data.byEvent" :key="row.event" class="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 text-sm dark:border-white/[0.06]"><span class="text-gray-600 dark:text-gray-300">{{ labels[row.event] || row.event }}</span><strong>{{ row.total }}</strong></div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.audience-chart { width: 100%; height: auto; }
.chart-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: draw-chart 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.chart-line-secondary { animation-delay: 120ms; }
@keyframes draw-chart { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) {
  .chart-line { animation: none; stroke-dashoffset: 0; }
}
</style>
