<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'portal' })
const auth = useAuthStore()
const data = ref<any>(null)
const error = ref(false)
async function loadPortal() {
  error.value = false
  try { data.value = await $fetch('/api/portal/overview', { headers: auth.authHeader() }) }
  catch { data.value = null; error.value = true }
}
onMounted(loadPortal)
const money = (cents: number, currency: string) => new Intl.NumberFormat('fr-CH', { style: 'currency', currency }).format((cents || 0) / 100)
async function logout() { await auth.logout(); await navigateTo('/portal/login') }
async function downloadInvoice(invoice: { id: number, number: string }) {
  const blob = await $fetch<Blob>('/api/portal/invoice-pdf', { query: { id: invoice.id }, headers: auth.authHeader(), responseType: 'blob' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `facture-${invoice.number}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-950 dark:bg-[#080811] dark:text-white">
    <header class="border-b border-gray-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-[#111118]/90">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div><p class="font-display font-semibold">Antoine Quarroz</p><p class="text-xs text-gray-500">Espace client sécurisé</p></div>
        <button class="min-h-11 rounded-lg px-3 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]" @click="logout">Se déconnecter</button>
      </div>
    </header>
    <main class="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div v-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
        <p class="font-semibold">Votre espace n’est pas encore lié à une fiche client.</p><p class="mt-1 text-sm">Contactez Antoine pour activer l’accès.</p>
      </div>
      <template v-else-if="data">
        <section><p class="text-sm font-medium text-violet-600 dark:text-violet-300">Bonjour {{ data.client.name }}</p><h1 class="mt-2 font-display text-3xl font-semibold sm:text-4xl">Suivi de votre collaboration</h1><p class="mt-2 text-gray-500 dark:text-gray-400">Tous vos documents et projets au même endroit.</p></section>
        <section aria-labelledby="portal-projects"><h2 id="portal-projects" class="font-display text-xl font-semibold">Projets</h2><div class="mt-3 grid gap-3 md:grid-cols-2"><article v-for="project in data.projects" :key="project.id" class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#111118]"><p class="text-xs uppercase text-violet-600 dark:text-violet-300">{{ project.category }}</p><h3 class="mt-2 font-semibold">{{ project.title }}</h3><p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ project.description }}</p><a v-if="project.live_url" :href="project.live_url" target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-600 dark:text-violet-300">Voir le projet ↗</a></article><p v-if="!data.projects.length" class="text-sm text-gray-500">Aucun projet publié pour le moment.</p></div></section>
        <section aria-labelledby="portal-documents"><h2 id="portal-documents" class="font-display text-xl font-semibold">Documents</h2><div class="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#111118]"><div v-for="invoice in data.invoices" :key="invoice.id" class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 last:border-0 dark:border-white/[0.06]"><div><p class="font-semibold">Facture {{ invoice.number }}</p><p class="text-sm text-gray-500">{{ money(invoice.total_cents, invoice.currency) }} · {{ invoice.status }}</p></div><button type="button" class="inline-flex min-h-11 items-center rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white" @click="downloadInvoice(invoice)">Télécharger le PDF</button></div><p v-if="!data.invoices.length" class="p-5 text-sm text-gray-500">Aucune facture disponible.</p></div></section>
      </template>
      <button v-if="error" class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white" @click="loadPortal">Réessayer</button>
    </main>
  </div>
</template>
