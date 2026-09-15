<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface ApplicationError {
  id: string
  source: 'client' | 'server'
  severity: 'warning' | 'error' | 'fatal'
  message: string
  stack: string | null
  path: string | null
  fingerprint: string
  created_at: string
}

type CommercialHealth = {
  generatedAt: string
  windowHours: number
  status: 'healthy' | 'degraded'
  totals: { success: number, failure: number, recovered: number, unresolved: number }
  stages: Array<{ stage: 'lead' | 'quote' | 'invoice' | 'payment', success: number, failure: number, recovered: number, unresolved: number }>
  incidents: Array<{ correlationId: string, stage: 'lead' | 'quote' | 'invoice' | 'payment', code: string | null, createdAt: string, action: { label: string, to: string } }>
}

const auth = useAuthStore()
const toast = useToast()
const errors = ref<ApplicationError[]>([])
const loading = ref(false)
const loadError = ref('')
const resolvingIds = ref(new Set<string>())
const commercialHealth = ref<CommercialHealth | null>(null)
const commercialHealthError = ref(false)

const stageLabels = { lead: 'Prospects', quote: 'Devis', invoice: 'Factures', payment: 'Paiements' } as const

async function loadErrors() {
  loading.value = true
  loadError.value = ''
  commercialHealthError.value = false
  try {
    const [errorsResult, healthResult] = await Promise.allSettled([
      $fetch<ApplicationError[]>('/api/admin/errors', { headers: auth.authHeader() }),
      $fetch<CommercialHealth>('/api/admin/commercial-health', { headers: auth.authHeader() }),
    ])
    if (errorsResult.status === 'rejected') throw errorsResult.reason
    errors.value = errorsResult.value
    if (healthResult.status === 'fulfilled') commercialHealth.value = healthResult.value
    else {
      commercialHealth.value = null
      commercialHealthError.value = true
    }
  }
  catch {
    loadError.value = 'Les incidents ne peuvent pas être chargés. Réessaie dans quelques instants.'
  }
  finally {
    loading.value = false
  }
}

async function resolveError(id: string) {
  resolvingIds.value.add(id)
  try {
    await $fetch('/api/admin/errors', { method: 'PUT', body: { id }, headers: auth.authHeader() })
    errors.value = errors.value.filter(error => error.id !== id)
    toast.success('Erreur marquée comme résolue')
  }
  catch {
    toast.error('Impossible de résoudre cette erreur')
  }
  finally { resolvingIds.value.delete(id) }
}

async function copyCorrelationId(correlationId: string) {
  try {
    await navigator.clipboard.writeText(correlationId)
    toast.success('Identifiant de corrélation copié')
  }
  catch {
    toast.error('Impossible de copier l’identifiant')
  }
}

onMounted(loadErrors)
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Observabilité</span>
          <h1 class="mt-3 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Erreurs applicatives</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Incidents non résolus détectés dans le navigateur et sur le serveur.</p>
        </div>
        <button type="button" class="min-h-11 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait disabled:opacity-60 dark:bg-white/[0.08] dark:text-gray-100" :disabled="loading" @click="loadErrors">
          {{ loading ? 'Chargement…' : 'Rafraîchir' }}
        </button>
      </div>
    </section>

    <div v-if="loading && !errors.length" role="status" class="grid min-h-48 place-items-center rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]"><div class="text-center"><div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /><p class="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement des incidents…</p></div></div>
    <div v-else-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100"><p class="font-semibold">Les incidents sont indisponibles</p><p class="mt-1 text-sm">{{ loadError }}</p><button type="button" class="mt-4 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white" @click="loadErrors">Réessayer</button></div>

    <div v-if="commercialHealthError && !loadError" role="status" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
      La synthèse commerciale est indisponible. La liste des incidents reste accessible ci-dessous.
    </div>

    <section v-if="commercialHealth && !loadError" aria-labelledby="commercial-health-title" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="commercial-health-title" class="font-display text-lg font-semibold text-gray-950 dark:text-white">Santé du parcours commercial</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Contact → devis → facture → paiement · dernières {{ commercialHealth.windowHours }} h</p>
        </div>
        <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="commercialHealth.status === 'healthy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200'">
          {{ commercialHealth.status === 'healthy' ? 'Parcours sain' : `${commercialHealth.totals.unresolved} rupture(s) à vérifier` }}
        </span>
      </div>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="stage in commercialHealth.stages" :key="stage.stage" class="rounded-lg border border-gray-200 p-3 dark:border-white/[0.08]">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ stageLabels[stage.stage] }}</h3>
            <span v-if="stage.unresolved" class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-400/10 dark:text-red-200">{{ stage.unresolved }} à traiter</span>
            <span v-else class="text-xs font-medium text-emerald-600 dark:text-emerald-300">OK</span>
          </div>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ stage.success }} succès · {{ stage.recovered }} reprise(s)</p>
        </article>
      </div>
      <div v-if="commercialHealth.incidents.length" class="mt-4 space-y-2">
        <article v-for="incident in commercialHealth.incidents" :key="`${incident.correlationId}-${incident.stage}`" class="flex flex-col gap-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-400/[0.08] sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-amber-950 dark:text-amber-100">{{ stageLabels[incident.stage] }} · {{ incident.code || 'échec inattendu' }}</p>
            <p class="mt-1 truncate font-mono text-xs text-amber-800/80 dark:text-amber-200/70" :title="incident.correlationId">Corrélation {{ incident.correlationId }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="min-h-11 rounded-lg border border-amber-300 px-3 text-xs font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-300/30 dark:text-amber-100 dark:hover:bg-amber-300/10" @click="copyCorrelationId(incident.correlationId)">Copier l’identifiant</button>
            <NuxtLink :to="incident.action.to" class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-amber-900 px-3 text-xs font-semibold text-white hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-300 dark:text-amber-950">{{ incident.action.label }}</NuxtLink>
          </div>
        </article>
      </div>
    </section>

    <section v-if="!loading && !loadError" aria-live="polite" class="space-y-3">
      <article v-for="error in errors" :key="error.id" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="rounded-full bg-red-50 px-2 py-1 font-semibold uppercase text-red-700 dark:bg-red-500/10 dark:text-red-300">{{ error.severity }}</span>
              <span class="text-gray-500">{{ error.source === 'client' ? 'Navigateur' : 'Serveur' }}</span>
              <time class="text-gray-500" :datetime="error.created_at">{{ new Date(error.created_at).toLocaleString('fr-CH') }}</time>
            </div>
            <h2 class="mt-3 break-words text-sm font-semibold text-gray-900 dark:text-white">{{ error.message }}</h2>
            <p v-if="error.path" class="mt-1 break-all text-xs text-gray-500">{{ error.path }}</p>
          </div>
          <button type="button" class="min-h-11 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60" :disabled="resolvingIds.has(error.id)" @click="resolveError(error.id)">{{ resolvingIds.has(error.id) ? 'Traitement…' : 'Marquer comme résolue' }}</button>
        </div>
        <details v-if="error.stack" class="mt-3">
          <summary class="min-h-11 cursor-pointer rounded-lg text-xs font-medium leading-[2.75rem] text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300">Détails techniques</summary>
          <pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-3 text-xs text-gray-200">{{ error.stack }}</pre>
        </details>
      </article>

      <div v-if="!loading && !errors.length" class="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-white/[0.12] dark:bg-[#111118]">
        <p class="font-medium text-gray-800 dark:text-gray-100">Aucune erreur non résolue</p>
        <p class="mt-1 text-sm text-gray-500">Le navigateur et le serveur sont surveillés.</p>
      </div>
    </section>
  </div>
</template>
