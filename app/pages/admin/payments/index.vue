<script setup lang="ts">
import { Comment, h } from 'vue'
import { buildAccountingCsv } from '~~/shared/utils/accountingCsv'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const DirectionContract = () => h(Comment, null, `
THESIS: Un journal d’encaissement qui commence par les exceptions, pas un dashboard de graphiques décoratifs.
OWN-WORLD: Surfaces administratives calmes, violet pour l’action, cyan pour l’information et couleurs comptables réservées aux statuts.
STORY: Antoine comprend sa trésorerie, traite les anomalies, puis retrouve chaque mouvement dans un registre chronologique.
FIRST VIEWPORT: Titre et action Factures, bande synthèse compacte, puis file des éléments à surveiller avant le journal exportable.
FORM: Journal comptable opérationnel, structure 7 de la liste ordonnée; seed 7c57deef.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
`)

type PaymentAlert = {
  id: string
  kind: 'overdue_invoice' | 'stale_checkout'
  tone: 'critical' | 'warning'
  title: string
  detail: string
  amountCents: number
  currency: string
  invoiceId: number
}

type PaymentEntry = {
  id: string
  kind: 'payment' | 'checkout'
  status: 'confirmed' | 'voided' | 'open' | 'expired' | 'cancelled'
  occurredAt: string
  paidAt: string | null
  invoiceId: number
  invoiceNumber: string
  clientName: string
  amountCents: number
  currency: string
  method: string
  provider: string | null
  reference: string | null
  note: string | null
}

type PaymentOperations = {
  generatedAt: string
  metrics: {
    collectedCents: number
    collectedThisMonthCents: number
    outstandingCents: number
    overdueCents: number
    activeSessions: number
    attentionCount: number
  }
  alerts: PaymentAlert[]
  entries: PaymentEntry[]
}

const auth = useAuthStore()
const toast = useToast()
const data = ref<PaymentOperations | null>(null)
const loading = ref(true)
const loadError = ref('')
const query = ref('')
const entryFilter = ref<'all' | 'attention' | 'payments' | 'twint'>('all')

const methodLabels: Record<string, string> = {
  bank_transfer: 'Virement',
  swiss_qr: 'QR suisse',
  twint: 'TWINT',
  cash: 'Espèces',
  other: 'Autre',
}

const statusLabels: Record<PaymentEntry['status'], string> = {
  confirmed: 'Confirmé',
  voided: 'Annulé',
  open: 'En attente',
  expired: 'Expiré',
  cancelled: 'Interrompu',
}

const metricRows = computed(() => data.value ? [
  { label: 'Encaissé ce mois', value: money(data.value.metrics.collectedThisMonthCents), detail: `${money(data.value.metrics.collectedCents)} au total`, tone: 'violet' },
  { label: 'À encaisser', value: money(data.value.metrics.outstandingCents), detail: data.value.metrics.overdueCents ? `${money(data.value.metrics.overdueCents)} en retard` : 'Aucun retard', tone: data.value.metrics.overdueCents ? 'amber' : 'cyan' },
  { label: 'Sessions TWINT ouvertes', value: String(data.value.metrics.activeSessions), detail: 'Checkout actif, non débité', tone: 'cyan' },
  { label: 'À surveiller', value: String(data.value.metrics.attentionCount), detail: data.value.metrics.attentionCount ? 'Action recommandée' : 'Tout est à jour', tone: data.value.metrics.attentionCount ? 'amber' : 'cyan' },
] : [])

const filteredEntries = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('fr-CH')
  return (data.value?.entries || []).filter((entry) => {
    if (entryFilter.value === 'attention' && !['voided', 'expired', 'cancelled'].includes(entry.status)) return false
    if (entryFilter.value === 'payments' && entry.kind !== 'payment') return false
    if (entryFilter.value === 'twint' && entry.method !== 'twint') return false
    if (!needle) return true
    return [entry.invoiceNumber, entry.clientName, entry.reference, methodLabels[entry.method], statusLabels[entry.status]]
      .some(value => String(value || '').toLocaleLowerCase('fr-CH').includes(needle))
  })
})

function money(cents: number, currency = 'CHF') {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency }).format(Number(cents || 0) / 100)
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function statusClass(status: PaymentEntry['status']) {
  if (status === 'confirmed') return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200'
  if (status === 'open') return 'bg-cyan-50 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-200'
  if (status === 'expired' || status === 'cancelled') return 'bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200'
  return 'bg-gray-100 text-gray-700 dark:bg-white/[0.08] dark:text-gray-300'
}

function exportAccountingJournal() {
  if (!filteredEntries.value.length) return
  const csv = buildAccountingCsv(filteredEntries.value)
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `journal-encaissements-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success(`${filteredEntries.value.length} mouvement${filteredEntries.value.length > 1 ? 's' : ''} exporté${filteredEntries.value.length > 1 ? 's' : ''}`)
}

async function loadPayments() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await $fetch<PaymentOperations>('/api/admin/payment-operations', { headers: auth.authHeader() })
  }
  catch {
    data.value = null
    loadError.value = 'Le journal des encaissements ne peut pas être chargé. Réessaie dans quelques instants.'
  }
  finally { loading.value = false }
}

onMounted(loadPayments)
</script>

<template>
  <div class="space-y-5">
    <DirectionContract />
    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="max-w-2xl">
          <h1 class="font-display text-2xl font-semibold text-gray-950 dark:text-white">Encaissements</h1>
          <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">Suis les paiements confirmés, les soldes ouverts et les sessions TWINT depuis un registre unique.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" :disabled="loading" class="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 transition hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:text-gray-200 dark:hover:border-violet-400/50 dark:hover:text-violet-200" @click="loadPayments">
            {{ loading ? 'Actualisation…' : 'Actualiser' }}
          </button>
          <NuxtLink to="/admin/invoices" class="inline-flex min-h-11 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111118]">Ouvrir les factures</NuxtLink>
        </div>
      </div>
    </section>

    <div v-if="loading" role="status" aria-live="polite" class="space-y-5">
      <span class="sr-only">Chargement du journal des encaissements</span>
      <div class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 dark:border-white/[0.08] dark:bg-white/[0.08] lg:grid-cols-4">
        <div v-for="index in 4" :key="index" class="h-24 animate-pulse bg-white dark:bg-[#111118]" />
      </div>
      <div class="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.06]" />
    </div>

    <div v-else-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100">
      <p class="font-semibold">Les données de paiement sont indisponibles</p>
      <p class="mt-1 text-sm">{{ loadError }}</p>
      <button type="button" class="mt-4 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#211016]" @click="loadPayments">Réessayer</button>
    </div>

    <template v-else-if="data">
      <section aria-label="Synthèse des encaissements" class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 dark:border-white/[0.08] dark:bg-white/[0.08] lg:grid-cols-4">
        <article v-for="metric in metricRows" :key="metric.label" class="min-w-0 bg-white px-4 py-4 dark:bg-[#111118] sm:px-5">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ metric.label }}</p>
          <p class="mt-1 [overflow-wrap:anywhere] font-display text-lg font-semibold leading-tight tabular-nums text-gray-950 dark:text-white min-[420px]:text-xl sm:text-2xl">{{ metric.value }}</p>
          <p class="mt-1 text-xs leading-5" :class="metric.tone === 'amber' ? 'text-amber-800 dark:text-amber-200' : metric.tone === 'cyan' ? 'text-cyan-800 dark:text-cyan-200' : 'text-violet-700 dark:text-violet-300'">{{ metric.detail }}</p>
        </article>
      </section>

      <section aria-labelledby="payment-attention-title" class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
          <div>
            <h2 id="payment-attention-title" class="font-display text-lg font-semibold">À surveiller</h2>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Retards et sessions arrivées à expiration sans confirmation.</p>
          </div>
          <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="data.alerts.length ? 'bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200'">{{ data.alerts.length ? `${data.alerts.length} à traiter` : 'Tout est à jour' }}</span>
        </div>
        <ul v-if="data.alerts.length" class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <li v-for="alert in data.alerts" :key="alert.id" class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-semibold text-gray-900 dark:text-white">{{ alert.title }}</p>
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="alert.tone === 'critical' ? 'bg-red-50 text-red-800 dark:bg-red-400/10 dark:text-red-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200'">{{ alert.tone === 'critical' ? 'Prioritaire' : 'À vérifier' }}</span>
              </div>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ alert.detail }}</p>
            </div>
            <div class="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
              <strong class="tabular-nums">{{ money(alert.amountCents, alert.currency) }}</strong>
              <NuxtLink :to="`/admin/invoices?invoiceId=${alert.invoiceId}`" class="inline-flex min-h-11 items-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/10 dark:text-gray-200">Contrôler</NuxtLink>
            </div>
          </li>
        </ul>
        <div v-else class="px-5 py-7 text-center">
          <p class="font-medium text-gray-800 dark:text-gray-100">Aucune anomalie détectée</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Les factures et sessions TWINT sont cohérentes.</p>
        </div>
      </section>

      <section aria-labelledby="payment-ledger-title" class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="border-b border-gray-100 px-4 py-4 dark:border-white/[0.06] sm:px-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="payment-ledger-title" class="font-display text-lg font-semibold">Journal des mouvements</h2>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Paiements confirmés, écritures annulées et tentatives TWINT.</p>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <label class="sr-only" for="payment-search">Rechercher dans le journal</label>
              <input id="payment-search" v-model="query" type="search" class="min-h-11 rounded-lg border border-gray-200 bg-gray-50 px-3 text-base text-gray-900 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-gray-400 sm:text-sm" placeholder="Facture, client, référence…">
              <label class="sr-only" for="payment-filter">Filtrer les mouvements</label>
              <select id="payment-filter" v-model="entryFilter" class="min-h-11 rounded-lg border border-gray-200 bg-gray-50 px-3 text-base text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-white/10 dark:bg-[#181820] dark:text-white sm:text-sm">
                <option value="all">Tous les mouvements</option>
                <option value="attention">À contrôler</option>
                <option value="payments">Encaissements</option>
                <option value="twint">TWINT</option>
              </select>
              <button type="button" :disabled="filteredEntries.length === 0" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-violet-400/50 dark:hover:text-violet-200" :aria-label="`Exporter ${filteredEntries.length} mouvement${filteredEntries.length > 1 ? 's' : ''} au format CSV`" @click="exportAccountingJournal">
                <svg aria-hidden="true" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" /></svg>
                Exporter CSV
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredEntries.length">
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full min-w-[760px] text-left text-sm">
              <caption class="sr-only">Journal chronologique des encaissements et sessions TWINT</caption>
              <thead class="border-b border-gray-100 text-xs text-gray-500 dark:border-white/[0.06] dark:text-gray-400">
                <tr><th class="px-5 py-3 font-medium">Date</th><th class="px-3 py-3 font-medium">Facture</th><th class="px-3 py-3 font-medium">Client</th><th class="px-3 py-3 font-medium">Moyen</th><th class="px-3 py-3 font-medium">Statut</th><th class="px-5 py-3 text-right font-medium">Montant</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/[0.06]">
                <tr v-for="entry in filteredEntries" :key="entry.id" class="hover:bg-gray-50/70 dark:hover:bg-white/[0.025]">
                  <td class="whitespace-nowrap px-5 py-3 text-gray-500 dark:text-gray-400">{{ dateTime(entry.occurredAt) }}</td>
                  <td class="px-3 py-3 font-semibold text-gray-900 dark:text-white">{{ entry.invoiceNumber }}</td>
                  <td class="max-w-52 truncate px-3 py-3 text-gray-600 dark:text-gray-300">{{ entry.clientName }}</td>
                  <td class="px-3 py-3"><span class="font-medium">{{ methodLabels[entry.method] || entry.method }}</span><p v-if="entry.kind === 'checkout'" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Session Checkout</p></td>
                  <td class="px-3 py-3"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(entry.status)">{{ statusLabels[entry.status] }}</span><p v-if="entry.note" class="mt-1 max-w-52 truncate text-xs text-gray-500 dark:text-gray-400">{{ entry.note }}</p></td>
                  <td class="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums">{{ money(entry.amountCents, entry.currency) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <ol class="divide-y divide-gray-100 dark:divide-white/[0.06] md:hidden">
            <li v-for="entry in filteredEntries" :key="`mobile-${entry.id}`" class="px-4 py-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0"><p class="truncate font-semibold text-gray-900 dark:text-white">{{ entry.invoiceNumber }}</p><p class="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{{ entry.clientName }}</p></div>
                <strong class="shrink-0 tabular-nums">{{ money(entry.amountCents, entry.currency) }}</strong>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2 text-xs"><span class="font-medium text-gray-600 dark:text-gray-300">{{ methodLabels[entry.method] || entry.method }}</span><span class="inline-flex rounded-full px-2.5 py-1 font-semibold" :class="statusClass(entry.status)">{{ statusLabels[entry.status] }}</span><time class="ml-auto text-gray-500 dark:text-gray-400">{{ dateTime(entry.occurredAt) }}</time></div>
              <p v-if="entry.note" class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ entry.note }}</p>
            </li>
          </ol>
        </div>
        <div v-else-if="data.entries.length === 0" class="px-5 py-10 text-center">
          <p class="font-medium text-gray-800 dark:text-gray-100">Aucun mouvement enregistré</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Les paiements confirmés et les tentatives TWINT apparaîtront ici.</p>
          <NuxtLink to="/admin/invoices" class="mt-4 inline-flex min-h-11 items-center rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">Voir les factures</NuxtLink>
        </div>
        <div v-else class="px-5 py-10 text-center">
          <p class="font-medium text-gray-800 dark:text-gray-100">Aucun mouvement pour ce filtre</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Modifie la recherche ou affiche tous les mouvements.</p>
          <button v-if="query || entryFilter !== 'all'" type="button" class="mt-4 min-h-11 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/10 dark:text-gray-200" @click="query = ''; entryFilter = 'all'">Réinitialiser les filtres</button>
        </div>
      </section>
    </template>
  </div>
</template>
