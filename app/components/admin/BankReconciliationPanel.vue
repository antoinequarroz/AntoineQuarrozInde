<script setup lang="ts">
import {
  matchBankTransaction,
  parseBankCsv,
  type BankCsvResult,
  type BankTransaction,
  type ReconciliationInvoice,
  type ReconciliationMatch,
} from '~~/shared/utils/bankReconciliation'
import { parseCamt053 } from '~~/shared/utils/camt053'

type ReconciliationRow = {
  transaction: BankTransaction
  match: ReconciliationMatch
  selectedInvoiceId: number | null
  confirmedInvoiceLabel: string
  status: 'pending' | 'saving' | 'done' | 'ignored' | 'duplicate' | 'error'
  message: string
}

const emit = defineEmits<{ close: [], reconciled: [] }>()
const auth = useAuthStore()
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const candidates = ref<ReconciliationInvoice[]>([])
const candidateStatus = ref<'loading' | 'ready' | 'error'>('loading')
const candidateError = ref('')
const fileName = ref('')
const fileFormat = ref<'CSV' | 'CAMT.053'>('CSV')
const parseResult = ref<BankCsvResult | null>(null)
const parseError = ref('')
const rows = ref<ReconciliationRow[]>([])

const pendingCount = computed(() => rows.value.filter(row => row.status === 'pending' || row.status === 'error' || row.status === 'duplicate').length)
const completedCount = computed(() => rows.value.filter(row => row.status === 'done').length)

const confidenceLabels: Record<ReconciliationMatch['confidence'], string> = {
  exact: 'Exacte',
  probable: 'Probable',
  ambiguous: 'Ambiguë',
  none: 'À attribuer',
}

function money(cents: number, currency = 'CHF') {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency }).format(cents / 100)
}

function confidenceClass(confidence: ReconciliationMatch['confidence']) {
  if (confidence === 'exact') return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200'
  if (confidence === 'probable') return 'bg-cyan-50 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-200'
  if (confidence === 'ambiguous') return 'bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200'
  return 'bg-gray-100 text-gray-700 dark:bg-white/[0.08] dark:text-gray-300'
}

function eligibleInvoices(transaction: BankTransaction) {
  return candidates.value.filter(invoice => invoice.currency === transaction.currency && invoice.balanceCents >= transaction.amountCents)
}

async function loadCandidates() {
  candidateStatus.value = 'loading'
  candidateError.value = ''
  try {
    const response = await $fetch<{ invoices: ReconciliationInvoice[] }>('/api/admin/payment-reconciliation', { headers: auth.authHeader() })
    candidates.value = response.invoices
    candidateStatus.value = 'ready'
  }
  catch {
    candidateStatus.value = 'error'
    candidateError.value = 'Les factures à rapprocher ne peuvent pas être chargées.'
  }
}

function resetImport() {
  fileName.value = ''
  parseResult.value = null
  parseError.value = ''
  rows.value = []
  if (fileInput.value) fileInput.value.value = ''
}

async function handleFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  resetImport()
  fileName.value = file.name
  const isXml = file.name.toLowerCase().endsWith('.xml')
  if (!file.name.toLowerCase().endsWith('.csv') && !isXml) {
    parseError.value = 'Choisis un fichier CSV ou CAMT.053 XML.'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    parseError.value = 'Le fichier dépasse la limite de 2 Mo.'
    return
  }
  try {
    fileFormat.value = isXml ? 'CAMT.053' : 'CSV'
    const result = isXml ? parseCamt053(await file.text()) : parseBankCsv(await file.text())
    parseResult.value = result
    rows.value = result.transactions.map((transaction) => {
      const match = matchBankTransaction(transaction, candidates.value)
      return { transaction, match, selectedInvoiceId: match.invoiceId, confirmedInvoiceLabel: '', status: 'pending', message: '' }
    })
    if (!result.transactions.length) parseError.value = 'Aucune entrée d’argent exploitable n’a été trouvée.'
  }
  catch (error) {
    parseError.value = error instanceof Error ? error.message : 'Le fichier ne peut pas être lu.'
  }
}

function ignoreRow(row: ReconciliationRow) {
  row.status = row.status === 'ignored' ? 'pending' : 'ignored'
  row.message = ''
}

function revalidatePendingRows(completedRow: ReconciliationRow) {
  for (const row of rows.value) {
    if (row === completedRow || !['pending', 'error', 'duplicate'].includes(row.status)) continue
    const match = matchBankTransaction(row.transaction, candidates.value)
    row.match = match
    if (!eligibleInvoices(row.transaction).some(invoice => invoice.id === row.selectedInvoiceId)) row.selectedInvoiceId = match.invoiceId
  }
}

async function confirmRow(row: ReconciliationRow) {
  if (!row.selectedInvoiceId || row.status === 'saving' || row.status === 'done' || row.status === 'ignored') return
  const selectedInvoice = eligibleInvoices(row.transaction).find(invoice => invoice.id === row.selectedInvoiceId)
  if (!selectedInvoice) {
    row.status = 'error'
    row.message = 'Cette facture ne dispose plus d’un solde suffisant.'
    return
  }
  row.status = 'saving'
  row.message = ''
  try {
    await $fetch('/api/admin/payment-reconciliation', {
      method: 'POST',
      headers: auth.authHeader(),
      body: { invoiceId: row.selectedInvoiceId, transaction: row.transaction },
    })
    row.confirmedInvoiceLabel = `${selectedInvoice.number} · ${selectedInvoice.clientName}`
    row.status = 'done'
    row.message = 'Encaissement enregistré'
    const invoice = candidates.value.find(candidate => candidate.id === selectedInvoice.id)
    if (invoice) invoice.balanceCents = Math.max(0, invoice.balanceCents - row.transaction.amountCents)
    revalidatePendingRows(row)
    toast.success(`Paiement rapproché · ${invoice?.number || 'facture'}`)
    emit('reconciled')
  }
  catch (error: any) {
    const statusCode = Number(error?.statusCode || error?.status || error?.response?.status)
    row.status = statusCode === 409 ? 'duplicate' : 'error'
    row.message = statusCode === 409 ? 'Déjà rapproché' : (error?.data?.message || 'Confirmation impossible')
  }
}

onMounted(loadCandidates)
</script>

<template>
  <section aria-labelledby="bank-reconciliation-title" class="overflow-hidden rounded-xl border border-violet-200 bg-white shadow-sm dark:border-violet-400/20 dark:bg-[#111118]">
    <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4 dark:border-white/[0.06] sm:px-5">
      <div class="max-w-2xl">
        <h2 id="bank-reconciliation-title" class="font-display text-lg font-semibold text-gray-950 dark:text-white">Rapprocher un relevé bancaire</h2>
        <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">Importe un CSV, vérifie les propositions, puis confirme chaque encaissement. Rien n’est enregistré automatiquement.</p>
      </div>
      <button type="button" class="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:bg-white/[0.06]" @click="emit('close')">Fermer</button>
    </div>

    <div v-if="candidateStatus === 'loading'" role="status" class="space-y-3 px-4 py-6 sm:px-5">
      <span class="sr-only">Chargement des factures rapprochables</span>
      <div class="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.06]" />
      <div class="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.06]" />
    </div>
    <div v-else-if="candidateStatus === 'error'" role="alert" class="px-4 py-6 sm:px-5">
      <p class="font-semibold text-red-800 dark:text-red-200">Rapprochement indisponible</p>
      <p class="mt-1 text-sm text-red-700 dark:text-red-300">{{ candidateError }}</p>
      <button type="button" class="mt-4 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" @click="loadCandidates">Réessayer</button>
    </div>
    <div v-else class="space-y-5 px-4 py-5 sm:px-5">
      <div v-if="!fileName" class="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-7 text-center dark:border-white/15 dark:bg-white/[0.03]">
        <p class="font-semibold text-gray-900 dark:text-white">Choisir un relevé bancaire</p>
        <p class="mx-auto mt-1 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">CSV ou CAMT.053 XML. Le fichier reste local dans ce navigateur, 2 Mo maximum.</p>
        <label class="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-[#111118]">
          Importer le relevé
          <input ref="fileInput" type="file" accept=".csv,.xml,text/csv,application/xml,text/xml" class="sr-only" aria-label="Importer un relevé bancaire" @change="handleFile">
        </label>
        <p v-if="!candidates.length" class="mt-4 text-sm text-amber-800 dark:text-amber-200">Aucune facture ouverte n’est actuellement rapprochable.</p>
      </div>

      <template v-else>
        <div class="flex flex-col gap-3 rounded-lg bg-gray-50 px-4 py-3 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <p class="truncate font-semibold text-gray-900 dark:text-white">{{ fileName }} <span class="ml-2 text-xs font-medium text-violet-700 dark:text-violet-300">{{ fileFormat }}</span></p>
            <p v-if="parseResult" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ parseResult.transactions.length }} entrée(s) reconnue(s) · {{ parseResult.rejected.length }} ligne(s) ignorée(s) · {{ completedCount }} rapprochée(s)</p>
          </div>
          <button type="button" class="min-h-11 shrink-0 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/10 dark:text-gray-200" @click="resetImport">Changer de fichier</button>
        </div>

        <div v-if="parseError" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{{ parseError }}</div>
        <div v-if="parseResult?.rejected.length" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          <p class="font-semibold">{{ parseResult.rejected.length }} ligne(s) non importée(s)</p>
          <p class="mt-1">{{ [...new Set(parseResult.rejected.map(item => item.reason))].join(' · ') }}</p>
        </div>

        <div v-if="rows.length" class="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
          <div class="hidden overflow-x-auto lg:block">
            <table class="w-full min-w-[920px] text-left text-sm">
              <caption class="sr-only">Propositions de rapprochement bancaire à confirmer</caption>
              <thead class="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-gray-400">
                <tr><th class="px-4 py-3 font-medium">Mouvement</th><th class="px-3 py-3 font-medium">Montant</th><th class="px-3 py-3 font-medium">Proposition</th><th class="px-3 py-3 font-medium">Facture</th><th class="px-4 py-3 text-right font-medium">Action</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/[0.06]">
                <tr v-for="row in rows" :key="row.transaction.id" :class="row.status === 'ignored' ? 'opacity-50' : ''">
                  <td class="max-w-64 px-4 py-3"><p class="font-medium text-gray-900 dark:text-white">{{ row.transaction.bookedAt }}</p><p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{{ row.transaction.reference || row.transaction.description || 'Sans référence' }}</p></td>
                  <td class="whitespace-nowrap px-3 py-3 font-semibold tabular-nums">{{ money(row.transaction.amountCents, row.transaction.currency) }}</td>
                  <td class="px-3 py-3"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="confidenceClass(row.match.confidence)">{{ confidenceLabels[row.match.confidence] }}</span><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ row.match.reason }}</p></td>
                  <td class="px-3 py-3">
                    <p v-if="row.status === 'done'" class="font-medium text-gray-800 dark:text-gray-100">{{ row.confirmedInvoiceLabel }}</p>
                    <template v-else>
                      <label class="sr-only" :for="`invoice-${row.transaction.id}`">Facture pour la ligne {{ row.transaction.rowNumber }}</label>
                      <select :id="`invoice-${row.transaction.id}`" v-model="row.selectedInvoiceId" :disabled="row.status === 'ignored'" class="min-h-11 w-full min-w-52 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60 dark:border-white/10 dark:bg-[#181820] dark:text-white"><option :value="null">Sélectionner une facture</option><option v-for="invoice in eligibleInvoices(row.transaction)" :key="invoice.id" :value="invoice.id">{{ invoice.number }} · {{ invoice.clientName }} · {{ money(invoice.balanceCents, invoice.currency) }}</option></select>
                    </template>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex justify-end gap-2">
                      <button type="button" class="min-h-11 rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:bg-white/[0.06]" :disabled="row.status === 'saving' || row.status === 'done'" @click="ignoreRow(row)">{{ row.status === 'ignored' ? 'Rétablir' : 'Ignorer' }}</button>
                      <button type="button" class="min-h-11 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!row.selectedInvoiceId || ['saving', 'done', 'ignored'].includes(row.status)" @click="confirmRow(row)">{{ row.status === 'saving' ? 'Confirmation…' : row.status === 'done' ? 'Confirmé' : 'Confirmer' }}</button>
                    </div>
                    <p v-if="row.message" :role="row.status === 'done' ? 'status' : 'alert'" aria-live="polite" class="mt-1 text-xs" :class="row.status === 'done' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'">{{ row.message }}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <ol class="divide-y divide-gray-100 dark:divide-white/[0.06] lg:hidden">
            <li v-for="row in rows" :key="`mobile-${row.transaction.id}`" class="space-y-3 px-4 py-4" :class="row.status === 'ignored' ? 'opacity-50' : ''">
              <div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="font-semibold text-gray-900 dark:text-white">{{ row.transaction.bookedAt }}</p><p class="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{{ row.transaction.reference || row.transaction.description || 'Sans référence' }}</p></div><strong class="shrink-0 tabular-nums">{{ money(row.transaction.amountCents, row.transaction.currency) }}</strong></div>
              <div class="flex flex-wrap items-center gap-2"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="confidenceClass(row.match.confidence)">{{ confidenceLabels[row.match.confidence] }}</span><span class="text-xs text-gray-500 dark:text-gray-400">{{ row.match.reason }}</span></div>
              <p v-if="row.status === 'done'" class="text-sm font-medium text-gray-800 dark:text-gray-100">Facture : {{ row.confirmedInvoiceLabel }}</p>
              <label v-else class="block text-xs font-medium text-gray-600 dark:text-gray-300">Facture<select v-model="row.selectedInvoiceId" :disabled="row.status === 'ignored'" class="mt-1 min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-base text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60 dark:border-white/10 dark:bg-[#181820] dark:text-white"><option :value="null">Sélectionner une facture</option><option v-for="invoice in eligibleInvoices(row.transaction)" :key="invoice.id" :value="invoice.id">{{ invoice.number }} · {{ invoice.clientName }} · {{ money(invoice.balanceCents, invoice.currency) }}</option></select></label>
              <div class="flex gap-2">
                <button type="button" class="min-h-11 flex-1 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/10 dark:text-gray-200" :disabled="row.status === 'saving' || row.status === 'done'" @click="ignoreRow(row)">{{ row.status === 'ignored' ? 'Rétablir' : 'Ignorer' }}</button>
                <button type="button" class="min-h-11 flex-1 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50" :disabled="!row.selectedInvoiceId || ['saving', 'done', 'ignored'].includes(row.status)" @click="confirmRow(row)">{{ row.status === 'saving' ? 'Confirmation…' : row.status === 'done' ? 'Confirmé' : 'Confirmer' }}</button>
              </div>
              <p v-if="row.message" :role="row.status === 'done' ? 'status' : 'alert'" aria-live="polite" class="text-xs" :class="row.status === 'done' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'">{{ row.message }}</p>
            </li>
          </ol>
        </div>
        <p v-if="rows.length" class="text-xs text-gray-500 dark:text-gray-400">{{ pendingCount }} mouvement(s) restent à contrôler. Fermer ou changer de fichier efface uniquement cette préparation locale.</p>
      </template>
    </div>
  </section>
</template>
