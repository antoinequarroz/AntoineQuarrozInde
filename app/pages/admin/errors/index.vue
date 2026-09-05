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

const auth = useAuthStore()
const toast = useToast()
const errors = ref<ApplicationError[]>([])
const loading = ref(false)
const loadError = ref('')
const resolvingIds = ref(new Set<string>())

async function loadErrors() {
  loading.value = true
  loadError.value = ''
  try {
    errors.value = await $fetch('/api/admin/errors', { headers: auth.authHeader() })
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

    <section v-else aria-live="polite" class="space-y-3">
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
