<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Comptabilité — Admin' })
const auth = useAuthStore()
const toast = useToast()
const year = new Date().getFullYear()
const from = ref(`${year}-01-01`)
const to = ref(`${year}-12-31`)
const currency = ref<'CHF' | 'EUR'>('CHF')
const loading = ref(true)
const error = ref('')
const summary = ref<any>(null)
const profiles = ref<any[]>([])
const clients = ref<any[]>([])
const saving = ref(false)
const generating = ref(false)
const form = reactive({ name: '', clientId: '', cadence: 'monthly', nextIssueDate: new Date().toISOString().slice(0, 10), paymentTermsDays: 30, currency: 'CHF', label: 'Maintenance mensuelle', unitPriceCents: 0, taxRate: 8.1 })
const money = (cents: number, currency = 'CHF') => new Intl.NumberFormat('fr-CH', { style: 'currency', currency }).format(Number(cents || 0) / 100)

async function load() {
  loading.value = true; error.value = ''
  try {
    const [accounting, recurring, clientRows] = await Promise.all([
      $fetch('/api/admin/accounting-summary', { query: { from: from.value, to: to.value, currency: currency.value }, headers: auth.authHeader() }),
      $fetch<any[]>('/api/admin/recurring-invoices', { headers: auth.authHeader() }),
      $fetch<any[]>('/api/clients', { headers: auth.authHeader() }),
    ])
    summary.value = accounting; profiles.value = recurring; clients.value = clientRows
  } catch { error.value = 'Les données comptables ne peuvent pas être chargées.' } finally { loading.value = false }
}
async function createProfile() {
  if (saving.value) return
  saving.value = true
  try {
    await $fetch('/api/admin/recurring-invoices', { method: 'POST', headers: auth.authHeader(), body: { ...form, clientId: Number(form.clientId), items: [{ label: form.label, quantity: 1, unitPriceCents: Number(form.unitPriceCents), taxRate: Number(form.taxRate) }] } })
    form.name = ''; await load(); toast.success('Récurrence créée en brouillon automatique')
  } catch (e: any) { toast.error(e?.data?.message || 'Création impossible') } finally { saving.value = false }
}
async function toggle(profile: any) {
  await $fetch('/api/admin/recurring-invoices', { method: 'PUT', headers: auth.authHeader(), body: { id: profile.id, active: !profile.active } }); await load()
}
async function generateDue() {
  if (generating.value) return
  generating.value = true
  try {
    const result = await $fetch<any>('/api/admin/recurring-invoices/run', { method: 'POST', headers: auth.authHeader() }); await load(); toast.success(`${result.generatedCount} brouillon(s) généré(s)`)
  } catch (e: any) { toast.error(e?.data?.message || 'Génération impossible') } finally { generating.value = false }
}
function exportCsv() {
  if (!summary.value) return
  const rows = [['Taux TVA', 'Base imposable', 'TVA', 'Total'], ...summary.value.vatRows.map((row: any) => [row.taxRate, row.taxableCents / 100, row.taxCents / 100, row.grossCents / 100])]
  const blob = new Blob([rows.map((row: any[]) => row.map(value => `"${value}"`).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `synthese-tva-${currency.value}-${from.value}-${to.value}.csv`; link.click(); URL.revokeObjectURL(link.href)
}
onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <header class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 class="font-display text-2xl font-semibold text-gray-950 dark:text-white">Comptabilité</h1><p class="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">Synthèse des ventes, avoirs, TVA facturée et encaissements. Cette vue opérationnelle ne remplace pas une déclaration fiscale officielle.</p></div>
        <div class="flex flex-wrap gap-2"><label class="text-xs text-gray-600 dark:text-gray-300">Du<input v-model="from" type="date" class="ml-2 min-h-11 rounded-lg border border-gray-200 bg-transparent px-2 dark:border-white/10"></label><label class="text-xs text-gray-600 dark:text-gray-300">Au<input v-model="to" type="date" class="ml-2 min-h-11 rounded-lg border border-gray-200 bg-transparent px-2 dark:border-white/10"></label><label class="text-xs text-gray-600 dark:text-gray-300">Devise<select v-model="currency" class="ml-2 min-h-11 rounded-lg border border-gray-200 bg-transparent px-2 dark:border-white/10"><option value="CHF">CHF</option><option value="EUR">EUR</option></select></label><button :disabled="loading" class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-60" @click="load">Actualiser</button></div>
      </div>
    </header>
    <div v-if="loading" role="status" class="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.06]"><span class="sr-only">Chargement de la comptabilité</span></div>
    <div v-else-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ error }}</div>
    <template v-else-if="summary">
      <section aria-label="Synthèse comptable" class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 dark:border-white/[0.08] dark:bg-white/[0.08] lg:grid-cols-4">
        <article v-for="metric in [{l:'Net facturé',v:money(summary.totals.totalCents, summary.currency)},{l:'TVA facturée',v:money(summary.totals.taxCents, summary.currency)},{l:'Avoirs',v:money(summary.totals.creditNotesCents, summary.currency)},{l:`Encaissements ${summary.currency}`,v:money(summary.collectedByCurrency[summary.currency] || 0, summary.currency)}]" :key="metric.l" class="bg-white p-4 dark:bg-[#111118]"><p class="text-xs text-gray-500 dark:text-gray-400">{{ metric.l }}</p><strong class="mt-1 block text-xl tabular-nums">{{ metric.v }}</strong></article>
      </section>
      <section class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]"><div class="flex items-center justify-between border-b border-gray-100 p-4 dark:border-white/[0.06]"><div><h2 class="font-semibold">TVA par taux</h2><p class="text-xs text-gray-500 dark:text-gray-400">Documents {{ summary.currency }} émis du {{ from }} au {{ to }}</p></div><button class="min-h-11 rounded-lg border border-gray-200 px-3 text-sm font-semibold dark:border-white/10" @click="exportCsv">Exporter CSV</button></div><div class="overflow-x-auto"><table class="w-full min-w-[560px] text-sm"><thead class="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/[0.03] dark:text-gray-400"><tr><th class="p-3">Taux</th><th class="p-3">Base</th><th class="p-3">TVA</th><th class="p-3">Total</th></tr></thead><tbody><tr v-for="row in summary.vatRows" :key="row.taxRate" class="border-t border-gray-100 dark:border-white/[0.06]"><td class="p-3">{{ row.taxRate }} %</td><td class="p-3">{{ money(row.taxableCents, summary.currency) }}</td><td class="p-3">{{ money(row.taxCents, summary.currency) }}</td><td class="p-3 font-semibold">{{ money(row.grossCents, summary.currency) }}</td></tr><tr v-if="!summary.vatRows.length"><td colspan="4" class="p-6 text-center text-gray-500 dark:text-gray-400">Aucun document sur cette période.</td></tr></tbody></table></div></section>
    </template>
    <section class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111118]"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="font-semibold">Factures récurrentes</h2><p class="text-xs text-gray-500 dark:text-gray-400">La génération crée uniquement des brouillons à vérifier.</p></div><button :disabled="generating" class="min-h-11 rounded-lg border border-violet-200 px-3 text-sm font-semibold text-violet-700 disabled:opacity-60 dark:border-violet-400/30 dark:text-violet-200" @click="generateDue">{{ generating ? 'Génération…' : 'Générer les échéances' }}</button></div>
      <form class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Nouvelle facture récurrente" :aria-busy="saving" @submit.prevent="createProfile"><label class="text-xs">Nom<input v-model="form.name" required class="input-field mt-1"></label><label class="text-xs">Client<select v-model="form.clientId" required class="input-field mt-1"><option value="">Choisir</option><option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option></select></label><label class="text-xs">Cadence<select v-model="form.cadence" class="input-field mt-1"><option value="monthly">Mensuelle</option><option value="quarterly">Trimestrielle</option><option value="yearly">Annuelle</option></select></label><label class="text-xs">Prochaine émission<input v-model="form.nextIssueDate" type="date" required class="input-field mt-1"></label><label class="text-xs sm:col-span-2">Prestation<input v-model="form.label" required class="input-field mt-1"></label><label class="text-xs">Montant HT (centimes)<input v-model.number="form.unitPriceCents" type="number" min="1" required inputmode="numeric" class="input-field mt-1"></label><button :disabled="saving" class="min-h-11 self-end rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{{ saving ? 'Enregistrement…' : 'Créer la récurrence' }}</button></form>
      <div class="mt-4 divide-y divide-gray-100 dark:divide-white/[0.06]"><div v-for="profile in profiles" :key="profile.id" class="flex flex-wrap items-center justify-between gap-3 py-3"><div><p class="font-medium">{{ profile.name }}</p><p class="text-xs text-gray-500 dark:text-gray-400">{{ profile.cadence }} · prochaine émission {{ profile.next_issue_date }}</p></div><button class="min-h-10 rounded-lg border border-gray-200 px-3 text-xs font-semibold dark:border-white/10" @click="toggle(profile)">{{ profile.active ? 'Suspendre' : 'Reprendre' }}</button></div><p v-if="!profiles.length" class="py-5 text-sm text-gray-500">Aucune récurrence configurée.</p></div>
    </section>
  </div>
</template>
