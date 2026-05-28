<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const auth = useAuthStore()
const toast = useToast()

const loadingBackfill = ref(false)
const loadingCleanup = ref(false)

const lastBackfillResult = ref<{
  clientsInserted: number
  tasksInserted: number
  quotesInserted: number
  invoicesInserted: number
  appointmentsInserted: number
} | null>(null)

const lastCleanupResult = ref<{ deleted: number } | null>(null)

async function runBackfill() {
  loadingBackfill.value = true
  try {
    const result = await $fetch('/api/admin/audit/backfill', {
      method: 'POST',
      headers: auth.authHeader(),
    })
    lastBackfillResult.value = result as any
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
    toast.success('Nettoyage termine')
  } catch {
    toast.error('Erreur pendant le nettoyage')
  } finally {
    loadingCleanup.value = false
  }
}
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
  </div>
</template>
