<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'portal' })
const auth = useAuthStore()
const route = useRoute()
const data = ref<any>(null)
const error = ref(false)
const payingId = ref<number | null>(null)
const paymentErrorMessage = ref('')
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
async function payWithTwint(invoice: { id: number }) {
  payingId.value = invoice.id
  paymentErrorMessage.value = ''
  try {
    const checkout = await $fetch<{ url: string }>('/api/portal/twint-checkout', {
      method: 'POST',
      body: { invoiceId: invoice.id },
      headers: auth.authHeader(),
    })
    await navigateTo(checkout.url, { external: true })
  }
  catch (paymentError: any) {
    paymentErrorMessage.value = paymentError?.data?.message || 'Le paiement TWINT n’a pas pu être démarré. Réessayez ou contactez Antoine.'
  }
  finally { payingId.value = null }
}
const remainingCents = (invoice: any) => Math.max(0, Number(invoice.total_cents || 0) - Number(invoice.paid_amount_cents || 0))
const canPayWithTwint = (invoice: any) => data.value?.payments?.twintAvailable
  && invoice.document_type !== 'credit_note'
  && invoice.currency === 'CHF'
  && invoice.status !== 'cancelled'
  && remainingCents(invoice) > 0
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
        <div v-if="route.query.payment === 'success'" role="status" class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
          Paiement TWINT confirmé. La facture sera actualisée automatiquement dans quelques instants.
        </div>
        <div v-else-if="route.query.payment === 'cancelled'" role="status" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          Paiement interrompu. Aucun débit n’a été effectué et vous pouvez réessayer quand vous le souhaitez.
        </div>
        <div v-if="paymentErrorMessage" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100">
          {{ paymentErrorMessage }}
        </div>
        <section><p class="text-sm font-medium text-violet-600 dark:text-violet-300">Bonjour {{ data.client.name }}</p><h1 class="mt-2 font-display text-3xl font-semibold sm:text-4xl">Suivi de votre collaboration</h1><p class="mt-2 text-gray-500 dark:text-gray-400">Tous vos documents et projets au même endroit.</p></section>
        <section aria-labelledby="portal-projects"><h2 id="portal-projects" class="font-display text-xl font-semibold">Projets</h2><div class="mt-3 grid gap-3 md:grid-cols-2"><article v-for="project in data.projects" :key="project.id" class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#111118]"><p class="text-xs uppercase text-violet-600 dark:text-violet-300">{{ project.category }}</p><h3 class="mt-2 font-semibold">{{ project.title }}</h3><p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ project.description }}</p><div v-if="project.milestones?.length" class="mt-4"><div class="mb-2 flex items-center justify-between text-xs text-gray-500"><span>Avancement</span><span>{{ project.milestones.filter((item: any) => item.status === 'done').length }}/{{ project.milestones.length }} jalons</span></div><div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]"><div class="h-full rounded-full bg-violet-600" :style="{ width: `${project.milestones.filter((item: any) => item.status === 'done').length / project.milestones.length * 100}%` }" /></div></div><div v-if="project.deliverables?.length" class="mt-4 border-t border-gray-100 pt-3 dark:border-white/[0.06]"><p class="text-xs font-semibold text-gray-500">Livrables disponibles</p><a v-for="deliverable in project.deliverables" :key="deliverable.id" :href="deliverable.url || undefined" target="_blank" rel="noopener noreferrer" class="mt-1 block min-h-10 py-2 text-sm font-semibold text-violet-600 dark:text-violet-300">{{ deliverable.title }}{{ deliverable.url ? ' ↗' : '' }}</a></div><a v-if="project.live_url" :href="project.live_url" target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-600 dark:text-violet-300">Voir le projet ↗</a></article><p v-if="!data.projects.length" class="text-sm text-gray-500">Aucun projet publié pour le moment.</p></div></section>
        <section aria-labelledby="portal-documents">
          <h2 id="portal-documents" class="font-display text-xl font-semibold">Documents</h2>
          <div class="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#111118]">
            <div v-for="invoice in data.invoices" :key="invoice.id" class="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-4 last:border-0 dark:border-white/[0.06]">
              <div>
                <p class="font-semibold">{{ invoice.document_type === 'credit_note' ? 'Avoir' : 'Facture' }} {{ invoice.number }}</p>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ money(invoice.total_cents, invoice.currency) }} · {{ invoice.status }}</p>
                <p v-if="remainingCents(invoice) > 0 && invoice.document_type !== 'credit_note'" class="mt-1 text-xs text-gray-500 dark:text-gray-400">Solde à régler : {{ money(remainingCents(invoice), invoice.currency) }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="inline-flex min-h-11 items-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 transition-colors hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-violet-400/50 dark:hover:text-violet-200" @click="downloadInvoice(invoice)">Télécharger le PDF</button>
                <button v-if="canPayWithTwint(invoice)" type="button" :disabled="payingId === invoice.id" class="inline-flex min-h-11 items-center rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-offset-[#111118]" @click="payWithTwint(invoice)">
                  {{ payingId === invoice.id ? 'Ouverture de TWINT…' : 'Payer avec TWINT' }}
                </button>
              </div>
            </div>
            <p v-if="!data.invoices.length" class="p-5 text-sm text-gray-500">Aucune facture disponible.</p>
          </div>
        </section>
      </template>
      <button v-if="error" class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white" @click="loadPortal">Réessayer</button>
    </main>
  </div>
</template>
