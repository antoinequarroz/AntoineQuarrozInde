<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

type Subscription = {
  id: string
  email: string
  locale: string
  sourcePath: string
  status: 'active' | 'unsubscribed'
  consentedAt: string
  unsubscribedAt: string | null
}

const auth = useAuthStore()
const subscriptions = ref<Subscription[]>([])
const loading = ref(true)
const loadError = ref(false)

const active = computed(() => subscriptions.value.filter(item => item.status === 'active'))

async function loadSubscriptions() {
  loading.value = true
  loadError.value = false
  try {
    subscriptions.value = await $fetch<Subscription[]>('/api/admin/newsletter', { headers: auth.authHeader() })
  }
  catch {
    loadError.value = true
  }
  finally {
    loading.value = false
  }
}

onMounted(loadSubscriptions)
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Audience</span>
          <h1 class="mt-3 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Newsletter</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ active.length }} abonnement{{ active.length > 1 ? 's' : '' }} actif{{ active.length > 1 ? 's' : '' }}</p>
        </div>
        <button type="button" class="min-h-11 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/[0.04]" @click="loadSubscriptions">Actualiser</button>
      </div>
    </section>

    <div v-if="loading" role="status" class="grid min-h-48 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 dark:border-white/[0.08] dark:bg-[#111118]">Chargement des inscriptions…</div>
    <div v-else-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100">
      <p class="font-semibold">Les inscriptions sont indisponibles.</p>
      <button type="button" class="mt-4 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white" @click="loadSubscriptions">Réessayer</button>
    </div>
    <div v-else class="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/[0.06] dark:bg-[#111118]">
      <div v-if="!subscriptions.length" class="p-8 text-center text-sm text-gray-500">Aucune inscription pour l’instant.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead><tr class="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/[0.06] dark:text-gray-400"><th class="px-5 py-3">E-mail</th><th class="px-5 py-3">Source</th><th class="px-5 py-3">Consentement</th><th class="px-5 py-3">Statut</th></tr></thead>
          <tbody><tr v-for="item in subscriptions" :key="item.id" class="border-b border-gray-50 last:border-0 dark:border-white/[0.04]"><td class="px-5 py-4 font-medium text-gray-900 dark:text-white">{{ item.email }}</td><td class="px-5 py-4 text-gray-500 dark:text-gray-400">{{ item.sourcePath }}</td><td class="px-5 py-4 text-gray-500 dark:text-gray-400">{{ new Date(item.consentedAt).toLocaleDateString('fr-CH') }}</td><td class="px-5 py-4"><span class="rounded-full px-2 py-1 text-xs font-semibold" :class="item.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300'">{{ item.status === 'active' ? 'Actif' : 'Désinscrit' }}</span></td></tr></tbody>
        </table>
      </div>
    </div>
  </div>
</template>
