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
const appliedFilters = ref<{ from: string, to: string, currency: 'CHF' | 'EUR' } | null>(null)
const profiles = ref<any[]>([])
const clients = ref<any[]>([])
const saving = ref(false)
const generating = ref(false)
const togglingProfileId = ref<number | null>(null)
const form = reactive({ name: '', clientId: '', cadence: 'monthly', nextIssueDate: new Date().toISOString().slice(0, 10), paymentTermsDays: 30, currency: 'CHF', label: 'Maintenance mensuelle', unitPriceCents: 0, taxRate: 8.1 })

const dateError = computed(() => from.value > to.value ? 'La date de début doit précéder la date de fin.' : '')
const filtersDirty = computed(() => Boolean(appliedFilters.value && (
  appliedFilters.value.from !== from.value
  || appliedFilters.value.to !== to.value
  || appliedFilters.value.currency !== currency.value
)))
const unitPriceAmount = computed({
  get: () => form.unitPriceCents / 100,
  set: value => { form.unitPriceCents = Math.round(Number(value || 0) * 100) },
})
const money = (cents: number, selectedCurrency = 'CHF') => new Intl.NumberFormat('fr-CH', { style: 'currency', currency: selectedCurrency }).format(Number(cents || 0) / 100)
const dateLabel = (value: string) => value ? new Intl.DateTimeFormat('fr-CH').format(new Date(`${value}T12:00:00`)) : 'Non planifiée'
const cadenceLabel = (value: string) => ({ monthly: 'Mensuelle', quarterly: 'Trimestrielle', yearly: 'Annuelle' }[value] || value)

async function load() {
  if (dateError.value) return
  const requestFilters = { from: from.value, to: to.value, currency: currency.value }
  loading.value = true
  error.value = ''
  try {
    const [accounting, recurring, clientRows] = await Promise.all([
      $fetch('/api/admin/accounting-summary', { query: requestFilters, headers: auth.authHeader() }),
      $fetch<any[]>('/api/admin/recurring-invoices', { headers: auth.authHeader() }),
      $fetch<any[]>('/api/clients', { headers: auth.authHeader() }),
    ])
    summary.value = accounting
    appliedFilters.value = requestFilters
    profiles.value = recurring
    clients.value = clientRows
  }
  catch {
    error.value = 'Les données comptables ne peuvent pas être chargées. Vérifie ta connexion, puis réessaie.'
  }
  finally {
    loading.value = false
  }
}

async function createProfile() {
  if (saving.value) return
  if (form.unitPriceCents < 1) {
    toast.error('Indique un montant HT supérieur à zéro.')
    return
  }
  saving.value = true
  try {
    await $fetch('/api/admin/recurring-invoices', {
      method: 'POST',
      headers: auth.authHeader(),
      body: { ...form, clientId: Number(form.clientId), items: [{ label: form.label, quantity: 1, unitPriceCents: Number(form.unitPriceCents), taxRate: Number(form.taxRate) }] },
    })
    form.name = ''
    await load()
    toast.success('Récurrence créée. La prochaine échéance produira un brouillon à vérifier.')
  }
  catch (requestError: any) {
    toast.error(requestError?.data?.message || 'La récurrence n’a pas pu être créée. Vérifie les champs, puis réessaie.')
  }
  finally {
    saving.value = false
  }
}

async function toggle(profile: any) {
  if (togglingProfileId.value) return
  togglingProfileId.value = profile.id
  try {
    await $fetch('/api/admin/recurring-invoices', { method: 'PUT', headers: auth.authHeader(), body: { id: profile.id, active: !profile.active } })
    await load()
    toast.success(profile.active ? 'Récurrence suspendue.' : 'Récurrence reprise.')
  }
  catch (requestError: any) {
    toast.error(requestError?.data?.message || 'Le statut de la récurrence n’a pas pu être modifié.')
  }
  finally {
    togglingProfileId.value = null
  }
}

async function generateDue() {
  if (generating.value) return
  generating.value = true
  try {
    const result = await $fetch<any>('/api/admin/recurring-invoices/run', { method: 'POST', headers: auth.authHeader() })
    await load()
    toast.success(result.generatedCount ? `${result.generatedCount} brouillon(s) généré(s) et prêt(s) à vérifier.` : 'Aucune échéance à générer aujourd’hui.')
  }
  catch (requestError: any) {
    toast.error(requestError?.data?.message || 'Les échéances n’ont pas pu être générées. Réessaie dans quelques instants.')
  }
  finally {
    generating.value = false
  }
}

function exportCsv() {
  if (!summary.value || !appliedFilters.value || filtersDirty.value) return
  const rows = [['Taux TVA', 'Base imposable', 'TVA', 'Total'], ...summary.value.vatRows.map((row: any) => [row.taxRate, row.taxableCents / 100, row.taxCents / 100, row.grossCents / 100])]
  const blob = new Blob([rows.map((row: any[]) => row.map(value => `"${value}"`).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `synthese-tva-${appliedFilters.value.currency}-${appliedFilters.value.from}-${appliedFilters.value.to}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <header class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:p-5">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div class="max-w-2xl">
          <h1 class="font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Comptabilité</h1>
          <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">Synthèse des ventes, avoirs, TVA facturée et encaissements. Cette vue opérationnelle ne remplace pas une déclaration fiscale officielle.</p>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_100px_auto] sm:items-end">
          <label class="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-300">Du
            <input v-model="from" type="date" class="input-field" :aria-invalid="Boolean(dateError)" aria-describedby="accounting-date-error">
          </label>
          <label class="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-300">Au
            <input v-model="to" type="date" class="input-field" :aria-invalid="Boolean(dateError)" aria-describedby="accounting-date-error">
          </label>
          <label class="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-300">Devise
            <select v-model="currency" class="input-field"><option value="CHF">CHF</option><option value="EUR">EUR</option></select>
          </label>
          <button :disabled="loading || Boolean(dateError)" class="min-h-12 self-end rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50" @click="load">{{ loading ? 'Actualisation…' : 'Actualiser' }}</button>
          <p v-if="dateError" id="accounting-date-error" role="alert" class="col-span-2 text-xs font-medium text-red-600 sm:col-span-4 dark:text-red-300">{{ dateError }}</p>
          <p v-else-if="filtersDirty" role="status" class="col-span-2 text-xs font-medium text-amber-700 sm:col-span-4 dark:text-amber-300">Période modifiée : actualise la synthèse avant de l’exporter.</p>
        </div>
      </div>
    </header>

    <div v-if="loading" role="status" class="space-y-4" aria-live="polite">
      <span class="sr-only">Chargement de la comptabilité</span>
      <div class="h-40 animate-pulse rounded-xl bg-gray-200/70 dark:bg-white/[0.06]" />
      <div class="h-52 animate-pulse rounded-xl bg-gray-200/70 dark:bg-white/[0.06]" />
    </div>
    <div v-else-if="error" role="alert" class="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between">
      <div><p class="font-semibold">Chargement impossible</p><p class="mt-1 text-sm">{{ error }}</p></div>
      <button class="min-h-11 shrink-0 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800" @click="load">Réessayer</button>
    </div>

    <template v-else-if="summary">
      <section aria-label="Synthèse comptable" class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 dark:border-white/[0.08] dark:bg-white/[0.08] lg:grid-cols-4">
        <article v-for="metric in [{ l: 'Net facturé', v: money(summary.totals.totalCents, summary.currency) }, { l: 'TVA facturée', v: money(summary.totals.taxCents, summary.currency) }, { l: 'Avoirs', v: money(summary.totals.creditNotesCents, summary.currency) }, { l: `Encaissements ${summary.currency}`, v: money(summary.collectedByCurrency[summary.currency] || 0, summary.currency) }]" :key="metric.l" class="min-w-0 bg-white p-4 dark:bg-[#111118]">
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ metric.l }}</p>
          <strong class="mt-1 block truncate text-lg tabular-nums text-gray-950 dark:text-white sm:text-xl">{{ metric.v }}</strong>
        </article>
      </section>

      <section class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex items-start justify-between gap-3 border-b border-gray-100 p-4 dark:border-white/[0.06]">
          <div><h2 class="font-semibold text-gray-950 dark:text-white">TVA par taux</h2><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Documents {{ summary.currency }} émis du {{ dateLabel(appliedFilters?.from || summary.from) }} au {{ dateLabel(appliedFilters?.to || summary.to) }}</p></div>
          <button :disabled="filtersDirty" class="min-h-11 shrink-0 rounded-lg border border-gray-200 px-3 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[0.04]" @click="exportCsv">Exporter CSV</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[560px] text-sm">
            <thead class="bg-gray-50 text-left text-xs text-gray-600 dark:bg-white/[0.03] dark:text-gray-300"><tr><th class="p-3">Taux</th><th class="p-3">Base</th><th class="p-3">TVA</th><th class="p-3">Total</th></tr></thead>
            <tbody><tr v-for="row in summary.vatRows" :key="row.taxRate" class="border-t border-gray-100 dark:border-white/[0.06]"><td class="p-3">{{ row.taxRate }} %</td><td class="p-3 tabular-nums">{{ money(row.taxableCents, summary.currency) }}</td><td class="p-3 tabular-nums">{{ money(row.taxCents, summary.currency) }}</td><td class="p-3 font-semibold tabular-nums">{{ money(row.grossCents, summary.currency) }}</td></tr><tr v-if="!summary.vatRows.length"><td colspan="4" class="p-6 text-center text-gray-500 dark:text-gray-400">Aucun document émis dans cette devise et cette période.</td></tr></tbody>
          </table>
        </div>
      </section>
    </template>

    <section v-if="!loading && !error" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 class="font-semibold text-gray-950 dark:text-white">Factures récurrentes</h2><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Chaque échéance crée uniquement un brouillon à vérifier. Aucun document n’est envoyé automatiquement.</p></div>
        <button :disabled="generating" class="min-h-11 shrink-0 rounded-lg border border-violet-300 px-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60 dark:border-violet-400/30 dark:text-violet-200 dark:hover:bg-violet-500/10" @click="generateDue">{{ generating ? 'Génération…' : 'Générer les échéances' }}</button>
      </div>

      <form class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Nouvelle facture récurrente" :aria-busy="saving" @submit.prevent="createProfile">
        <label class="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-300">Nom de la récurrence<input v-model="form.name" required class="input-field" placeholder="Ex. Maintenance mensuelle"></label>
        <label class="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-300">Client<select v-model="form.clientId" required class="input-field"><option value="">Choisir un client</option><option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option></select></label>
        <label class="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-300">Cadence<select v-model="form.cadence" class="input-field"><option value="monthly">Mensuelle</option><option value="quarterly">Trimestrielle</option><option value="yearly">Annuelle</option></select></label>
        <label class="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-300">Prochaine émission<input v-model="form.nextIssueDate" type="date" required class="input-field"></label>
        <label class="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-300">Devise<select v-model="form.currency" class="input-field"><option value="CHF">CHF</option><option value="EUR">EUR</option></select></label>
        <label class="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-300 sm:col-span-2">Prestation<input v-model="form.label" required class="input-field"></label>
        <label class="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-300">Montant HT ({{ form.currency }})<input v-model.number="unitPriceAmount" type="number" min="0.01" step="0.01" required inputmode="decimal" class="input-field"></label>
        <button :disabled="saving" class="min-h-12 self-end rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60 sm:col-span-2 lg:col-span-4">{{ saving ? 'Enregistrement…' : 'Créer la récurrence' }}</button>
      </form>

      <div v-if="profiles.length" class="mt-5 divide-y divide-gray-100 border-t border-gray-100 dark:divide-white/[0.06] dark:border-white/[0.06]">
        <div v-for="profile in profiles" :key="profile.id" class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0"><p class="truncate font-medium text-gray-950 dark:text-white">{{ profile.name }}</p><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ cadenceLabel(profile.cadence) }} · prochaine émission le {{ dateLabel(profile.next_issue_date) }}</p></div>
          <button :disabled="togglingProfileId === profile.id" class="min-h-11 shrink-0 rounded-lg border border-gray-200 px-3 text-xs font-semibold disabled:cursor-wait disabled:opacity-50 dark:border-white/10" @click="toggle(profile)">{{ togglingProfileId === profile.id ? 'Mise à jour…' : profile.active ? 'Suspendre' : 'Reprendre' }}</button>
        </div>
      </div>
      <div v-else class="mt-5 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center dark:border-white/[0.1]"><p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Aucune récurrence configurée</p><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Remplis le formulaire ci-dessus pour préparer ton premier cycle de facturation.</p></div>
    </section>
  </div>
</template>
