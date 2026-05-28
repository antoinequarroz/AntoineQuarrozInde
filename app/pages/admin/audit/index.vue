<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const auth = useAuthStore()
const toast = useToast()

const loadingBackfill = ref(false)
const loadingCleanup = ref(false)
const loadingRuns = ref(false)

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
  try {
    const data = await $fetch('/api/admin/audit/runs', {
      headers: auth.authHeader(),
    })
    runs.value = (data as any[]) || []
  } catch {
    runs.value = []
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
    toast.success('Backfill termine')
  } catch {
    toast.error('Erreur pendant le backfill')
  } finally {
    loadingBackfill.value = false
  }
}

async function runCleanup() {
  if (!confirm('Supprimer toutes les entrees backfill de cette organisation ?')) return
  loadingCleanup.value = true
  try {
    const result = await $fetch('/api/admin/audit/cleanup', {
      method: 'POST',
      headers: auth.authHeader(),
    })
    lastCleanupResult.value = result as any
    await loadRuns()
    toast.success('Nettoyage termine')
  } catch {
    toast.error('Erreur pendant le nettoyage')
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
    <div>
      <h1 class="font-display font-semibold text-xl text-gray-900 dark:text-white">Maintenance audit</h1>
      <p class="text-sm text-gray-400 mt-0.5">Backfill historique et nettoyage des entrees generees automatiquement.</p>
    </div>

    <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-5 space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60"
          :disabled="loadingBackfill || loadingCleanup"
          @click="runBackfill"
        >
          {{ loadingBackfill ? 'Backfill en cours...' : 'Relancer backfill' }}
        </button>

        <button
          class="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
          :disabled="loadingBackfill || loadingCleanup"
          @click="runCleanup"
        >
          {{ loadingCleanup ? 'Nettoyage en cours...' : 'Nettoyer backfill' }}
        </button>
      </div>

      <p class="text-xs text-gray-500 dark:text-gray-400">
        Les actions sont journalisees dans l'audit avec date/acteur/resultat.
      </p>

      <div v-if="lastBackfillResult" class="rounded-lg border border-violet-200/50 dark:border-violet-500/20 p-4">
        <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Dernier resultat backfill</p>
        <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>Clients: {{ lastBackfillResult.clientsInserted }}</li>
          <li>Taches: {{ lastBackfillResult.tasksInserted }}</li>
          <li>Devis: {{ lastBackfillResult.quotesInserted }}</li>
          <li>Factures: {{ lastBackfillResult.invoicesInserted }}</li>
          <li>Rendez-vous: {{ lastBackfillResult.appointmentsInserted }}</li>
        </ul>
      </div>

      <div v-if="lastCleanupResult" class="rounded-lg border border-red-200/50 dark:border-red-500/20 p-4">
        <p class="text-sm text-gray-700 dark:text-gray-200">
          Entrees supprimees: <strong>{{ lastCleanupResult.deleted }}</strong>
        </p>
      </div>
    </div>

    <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Historique maintenance</h2>
        <button
          class="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-200"
          :disabled="loadingRuns"
          @click="loadRuns"
        >
          {{ loadingRuns ? 'Chargement...' : 'Rafraichir' }}
        </button>
      </div>

      <div v-if="runs.length" class="space-y-2">
        <div
          v-for="run in runs"
          :key="run.id"
          class="rounded-lg border border-gray-100 dark:border-white/[0.06] p-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100">
              {{ formatRunLabel(run.action) }}
            </p>
            <p class="text-xs text-gray-500">{{ new Date(run.created_at).toLocaleString() }}</p>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Lance par: {{ run.payload?.actorEmail || 'Inconnu' }}
          </p>
          <div class="text-xs text-gray-600 dark:text-gray-300 mt-2">
            <span v-if="run.action === 'audit_backfill_cleanup'">
              Supprime: <strong>{{ run.payload?.deleted || 0 }}</strong>
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

      <p v-else class="text-sm text-gray-500">Aucun run de maintenance pour le moment.</p>
    </div>
  </div>
</template>
