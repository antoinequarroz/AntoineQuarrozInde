<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const auth = useAuthStore()
const toast = useToast()

const loadingBackfill = ref(false)
const loadingCleanup = ref(false)
const loadingRuns = ref(false)
const loadError = ref('')

const lastBackfillResult = ref<{
  clientsInserted: number
  tasksInserted: number
  quotesInserted: number
  invoicesInserted: number
  appointmentsInserted: number
} | null>(null)

const lastCleanupResult = ref<{ deleted: number } | null>(null)
const runs = ref<Array<{
  id: number
  action: string
  payload: Record<string, any> | null
  created_at: string
}>>([])

async function loadRuns() {
  loadingRuns.value = true
  loadError.value = ''
  try {
    const data = await $fetch('/api/admin/audit/runs', {
      headers: auth.authHeader(),
    })
    runs.value = (data as any[]) || []
  } catch {
    runs.value = []
    loadError.value = 'L’historique de maintenance ne peut pas être chargé.'
  } finally {
    loadingRuns.value = false
  }
}

async function runBackfill() {
  loadingBackfill.value = true
  try {
    const result = await $fetch('/api/admin/audit/backfill', {
      method: 'POST',
      headers: auth.authHeader(),
    })
    lastBackfillResult.value = result as any
    await loadRuns()
    toast.success('Backfill terminé')
  } catch {
    toast.error('Le backfill n’a pas pu être exécuté')
  } finally {
    loadingBackfill.value = false
  }
}

async function runCleanup() {
  if (!confirm('Supprimer toutes les entrées générées par le backfill pour cette organisation ? Cette action est irréversible.')) return
  loadingCleanup.value = true
  try {
    const result = await $fetch('/api/admin/audit/cleanup', {
      method: 'POST',
      headers: auth.authHeader(),
    })
    lastCleanupResult.value = result as any
    await loadRuns()
    toast.success('Nettoyage terminé')
  } catch {
    toast.error('Le nettoyage n’a pas pu être exécuté')
  } finally {
    loadingCleanup.value = false
  }
}

function formatRunLabel(action: string) {
  return action === 'audit_backfill_cleanup' ? 'Nettoyage backfill' : 'Backfill'
}

onMounted(() => {
  loadRuns()
})
</script>

<template>
  <div class="space-y-5">
    <section class="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative min-w-0">
        <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Maintenance</span>
        <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Maintenance audit</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Reconstitution de l’historique et nettoyage des entrées générées automatiquement.</p>
      </div>
    </section>

    <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-5 space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
          :disabled="loadingBackfill || loadingCleanup"
          @click="runBackfill"
        >
          {{ loadingBackfill ? 'Backfill en cours…' : 'Relancer le backfill' }}
        </button>

        <button
          class="min-h-11 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:border-red-400/30 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10"
          :disabled="loadingBackfill || loadingCleanup"
          @click="runCleanup"
        >
          {{ loadingCleanup ? 'Nettoyage en cours…' : 'Nettoyer les données générées' }}
        </button>
      </div>

      <p class="text-xs text-gray-500 dark:text-gray-400">
        Chaque action est journalisée avec sa date, son auteur et son résultat. Le nettoyage supprime uniquement les données créées par le backfill.
      </p>

      <div v-if="lastBackfillResult" role="status" class="rounded-lg border border-violet-200/50 p-4 dark:border-violet-500/20">
        <p class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">Dernier résultat du backfill</p>
        <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>Clients: {{ lastBackfillResult.clientsInserted }}</li>
          <li>Tâches : {{ lastBackfillResult.tasksInserted }}</li>
          <li>Devis: {{ lastBackfillResult.quotesInserted }}</li>
          <li>Factures: {{ lastBackfillResult.invoicesInserted }}</li>
          <li>Rendez-vous : {{ lastBackfillResult.appointmentsInserted }}</li>
        </ul>
      </div>

      <div v-if="lastCleanupResult" role="status" class="rounded-lg border border-red-200/50 p-4 dark:border-red-500/20">
        <p class="text-sm text-gray-700 dark:text-gray-200">
          Entrées supprimées : <strong>{{ lastCleanupResult.deleted }}</strong>
        </p>
      </div>
    </div>

    <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Historique maintenance</h2>
        <button
          class="min-h-11 rounded-lg bg-gray-100 px-3 text-xs font-semibold text-gray-700 dark:bg-white/[0.06] dark:text-gray-200"
          :disabled="loadingRuns"
          @click="loadRuns"
        >
          {{ loadingRuns ? 'Chargement…' : 'Rafraîchir' }}
        </button>
      </div>

      <div v-if="loadingRuns && !runs.length" role="status" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Chargement de l’historique…</div>
      <div v-else-if="loadError" role="alert" class="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-200"><p>{{ loadError }}</p><button type="button" class="mt-2 min-h-11 font-semibold underline underline-offset-2" @click="loadRuns">Réessayer</button></div>
      <div v-else-if="runs.length" class="space-y-2">
        <div
          v-for="run in runs"
          :key="run.id"
          class="rounded-lg border border-gray-100 dark:border-white/[0.06] p-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100">
              {{ formatRunLabel(run.action) }}
            </p>
            <time class="text-xs text-gray-500" :datetime="run.created_at">{{ new Date(run.created_at).toLocaleString('fr-CH') }}</time>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Lancé par : {{ run.payload?.actorEmail || 'Inconnu' }}
          </p>
          <div class="text-xs text-gray-600 dark:text-gray-300 mt-2">
            <span v-if="run.action === 'audit_backfill_cleanup'">
              Supprimées : <strong>{{ run.payload?.deleted || 0 }}</strong>
            </span>
            <span v-else>
              C: <strong>{{ run.payload?.clientsInserted || 0 }}</strong> ·
              T: <strong>{{ run.payload?.tasksInserted || 0 }}</strong> ·
              D: <strong>{{ run.payload?.quotesInserted || 0 }}</strong> ·
              F: <strong>{{ run.payload?.invoicesInserted || 0 }}</strong> ·
              RDV: <strong>{{ run.payload?.appointmentsInserted || 0 }}</strong>
            </span>
          </div>
        </div>
      </div>

      <AdminEmptyState v-else title="Aucune opération de maintenance" body="Les prochains backfills et nettoyages apparaîtront ici." />
    </div>
  </div>
</template>
