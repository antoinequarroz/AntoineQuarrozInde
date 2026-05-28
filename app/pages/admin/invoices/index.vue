<script setup lang="ts">
import type { Invoice } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin' })
const store = useInvoicesStore()
const clients = useClientsStore()
const quotes = useQuotesStore()
const route = useRoute()
const toast = useToast()
const showForm = ref(false)
const editing = ref<Invoice | null>(null)
const form = reactive({ number: '', clientId: null as number | null, quoteId: null as number | null, amountCents: 0, currency: 'CHF', status: 'draft' as Invoice['status'], issuedAt: '', dueAt: '', paidAt: '', notes: '' })
const formItems = ref<Array<{ label: string, description: string | null, quantity: number, unitPriceCents: number, taxRate: number }>>([{ label: 'Prestation', description: null, quantity: 1, unitPriceCents: 0, taxRate: 8.1 }])
const clientsById = computed(() => new Map(clients.clients.map(c => [c.id, c])))
const quotesById = computed(() => new Map(quotes.quotes.map(q => [q.id, q])))
const filteredQuotes = computed(() => {
  if (!form.clientId) return quotes.quotes
  return quotes.quotes.filter(q => q.clientId === form.clientId)
})
const selectedId = ref<number | null>(null)
const selectedInvoice = computed(() => store.invoices.find(i => i.id === selectedId.value) ?? null)
const selectedQuote = computed(() => {
  if (!form.quoteId) return null
  return quotes.quotes.find(q => q.id === form.quoteId) ?? null
})
watch(() => form.clientId, () => {
  if (!form.quoteId) return
  const stillValid = filteredQuotes.value.some(q => q.id === form.quoteId)
  if (!stillValid) form.quoteId = null
})
watch(() => form.quoteId, () => {
  if (!selectedQuote.value) return
  form.clientId = selectedQuote.value.clientId
  form.amountCents = selectedQuote.value.amountCents
  form.currency = selectedQuote.value.currency
})
function openNew() { editing.value = null; Object.assign(form, { number: '', clientId: null, quoteId: null, amountCents: 0, currency: 'CHF', status: 'draft', issuedAt: '', dueAt: '', paidAt: '', notes: '' }); formItems.value = [{ label: 'Prestation', description: null, quantity: 1, unitPriceCents: 0, taxRate: 8.1 }]; showForm.value = true }
function openEdit(x: Invoice) { editing.value = x; Object.assign(form, x); formItems.value = (x.items?.length ? x.items.map(i => ({ label: i.label, description: i.description, quantity: i.quantity, unitPriceCents: i.unitPriceCents, taxRate: i.taxRate })) : [{ label: 'Prestation', description: null, quantity: 1, unitPriceCents: 0, taxRate: 8.1 }]); showForm.value = true }
function computeFormTotals(items: Array<{ quantity: number, unitPriceCents: number, taxRate: number }>) { const subtotalCents = items.reduce((acc, item) => acc + Math.round((Number(item.quantity) || 0) * (Number(item.unitPriceCents) || 0)), 0); const totalCents = items.reduce((acc, item) => { const line = Math.round((Number(item.quantity) || 0) * (Number(item.unitPriceCents) || 0)); return acc + Math.round(line * (1 + (Number(item.taxRate) || 0) / 100)) }, 0); return { subtotalCents, taxCents: Math.max(0, totalCents - subtotalCents), totalCents } }
const draftTotals = computed(() => computeFormTotals(formItems.value))
function addItem() { formItems.value.push({ label: '', description: null, quantity: 1, unitPriceCents: 0, taxRate: 8.1 }) }
function removeItem(idx: number) { formItems.value.splice(idx, 1) }
async function submit() { try { const totals = computeFormTotals(formItems.value); const payload = { ...form, amountCents: totals.totalCents, items: formItems.value, issuedAt: form.issuedAt || null, dueAt: form.dueAt || null, paidAt: form.paidAt || null, notes: form.notes || null }; if (editing.value) await store.update(editing.value.id, payload as any); else await store.add(payload as any); showForm.value = false; toast.success('Enregistre') } catch { toast.error('Erreur') } }
async function del(id: number) { if (!confirm('Supprimer ?')) return; try { await store.remove(id); if (selectedId.value === id) selectedId.value = store.invoices[0]?.id ?? null; toast.success('Supprime') } catch { toast.error('Erreur') } }
function formatAmount(amountCents: number, currency: string) { return `${(amountCents / 100).toFixed(2)} ${currency}` }
function escapeCsv(value: string | number | null | undefined) { const str = value == null ? '' : String(value); return `"${str.replace(/"/g, '""')}"` }
function exportCsv() {
  const header = ['Numero', 'Client', 'Devis', 'Montant', 'Devise', 'Statut', 'Emission', 'Echeance', 'PayeLe', 'Notes']
  const rows = store.invoices.map(i => [
    i.number,
    i.clientId ? (clientsById.value.get(i.clientId)?.name || '') : '',
    i.quoteId ? (quotesById.value.get(i.quoteId)?.number || '') : '',
    (i.amountCents / 100).toFixed(2),
    i.currency,
    i.status,
    i.issuedAt || '',
    i.dueAt || '',
    i.paidAt || '',
    i.notes || '',
  ])
  const content = [header, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `factures-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
function printSelected() {
  if (!selectedInvoice.value) { toast.error('Selectionne une facture'); return }
  const i = selectedInvoice.value
  const client = i.clientId ? (clientsById.value.get(i.clientId)?.name || '-') : '-'
  const quote = i.quoteId ? (quotesById.value.get(i.quoteId)?.number || '-') : '-'
  const html = `
    <html><head><title>Facture ${i.number}</title></head>
    <body style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
      <h1 style="margin:0 0 16px;">Facture ${i.number}</h1>
      <p><strong>Client:</strong> ${client}</p>
      <p><strong>Devis:</strong> ${quote}</p>
      <p><strong>Montant:</strong> ${formatAmount(i.amountCents, i.currency)}</p>
      <p><strong>Statut:</strong> ${i.status}</p>
      <p><strong>Emission:</strong> ${i.issuedAt || '-'}</p>
      <p><strong>Echeance:</strong> ${i.dueAt || '-'}</p>
      <p><strong>Paye le:</strong> ${i.paidAt || '-'}</p>
      <p><strong>Notes:</strong><br/>${(i.notes || '-').replace(/\n/g, '<br/>')}</p>
    </body></html>`
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}
function downloadPdf() {
  if (!selectedInvoice.value) { toast.error('Selectionne une facture'); return }
  window.open(`/api/invoices/pdf?id=${selectedInvoice.value.id}`, '_blank')
}
onMounted(async () => {
  await Promise.all([store.ensureLoaded(), clients.ensureLoaded(), quotes.ensureLoaded()])
  if (route.query.new === '1') {
    openNew()
    const id = Number(route.query.clientId || 0)
    if (id) form.clientId = id
  }
  if (store.invoices.length) selectedId.value = store.invoices[0].id
})
</script>
<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3"><h1 class="font-display font-semibold text-xl">Factures</h1><div class="admin-page-actions"><button class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="exportCsv">Exporter CSV</button><button class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="printSelected">Imprimer</button><button class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="downloadPdf">PDF</button><button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm" @click="openNew">Nouvelle</button></div></div>
    <div class="grid lg:grid-cols-[1fr_320px] gap-4">
    <div class="space-y-3">
      <div class="sm:hidden space-y-2">
        <button
          v-for="q in store.invoices"
          :key="`mobile-${q.id}`"
          class="w-full rounded-xl border p-3 text-left bg-white dark:bg-[#111118] border-gray-100 dark:border-white/[0.06]"
          :class="selectedId === q.id ? 'ring-1 ring-violet-500/60' : ''"
          @click="selectedId = q.id"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-semibold">{{ q.number }}</p>
            <span class="text-[11px] uppercase text-gray-400">{{ q.status }}</span>
          </div>
          <p class="mt-1 text-xs text-gray-500">{{ q.clientId ? clientsById.get(q.clientId)?.name || '-' : '-' }}</p>
          <p class="mt-1 text-xs text-gray-500">Echeance: {{ q.dueAt || '-' }}</p>
          <p class="mt-2 text-sm font-medium">{{ formatAmount(q.amountCents, q.currency) }}</p>
          <div class="mt-3 flex items-center gap-3">
            <button class="text-xs text-violet-600" @click.stop="openEdit(q)">Editer</button>
            <button class="text-xs text-red-500" @click.stop="del(q.id)">Supprimer</button>
          </div>
        </button>
      </div>

    <div class="admin-table-wrap hidden sm:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="admin-table w-full">
        <thead><tr class="border-b border-gray-100 dark:border-white/[0.06]"><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Numero</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Client</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Devis</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Montant</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Echeance</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Statut</th><th class="text-right px-4 py-3 text-xs uppercase text-gray-400">Actions</th></tr></thead>
        <tbody><tr v-for="q in store.invoices" :key="q.id" class="border-b border-gray-50 dark:border-white/[0.03] cursor-pointer" :class="selectedId === q.id ? 'bg-violet-50/60 dark:bg-violet-500/10' : ''" @click="selectedId = q.id"><td class="px-4 py-3 text-sm">{{ q.number }}</td><td class="px-4 py-3 text-sm">{{ q.clientId ? clientsById.get(q.clientId)?.name || '-' : '-' }}</td><td class="px-4 py-3 text-sm">{{ q.quoteId ? quotesById.get(q.quoteId)?.number || '-' : '-' }}</td><td class="px-4 py-3 text-sm">{{ formatAmount(q.amountCents, q.currency) }}</td><td class="px-4 py-3 text-sm">{{ q.dueAt || '-' }}</td><td class="px-4 py-3 text-sm">{{ q.status }}</td><td class="px-4 py-3 text-right space-x-2"><button class="text-xs text-violet-600" @click.stop="openEdit(q)">Editer</button><button class="text-xs text-red-500" @click.stop="del(q.id)">Supprimer</button></td></tr></tbody>
      </table>
    </div>
    </div>
    <div class="hidden lg:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-4 lg:sticky lg:top-20">
      <template v-if="selectedInvoice">
        <p class="text-xs uppercase text-gray-400">Apercu</p>
        <h2 class="text-lg font-semibold mt-1">{{ selectedInvoice.number }}</h2>
        <div class="mt-4 space-y-2 text-sm">
          <p><span class="text-gray-400">Client:</span> {{ selectedInvoice.clientId ? clientsById.get(selectedInvoice.clientId)?.name || '-' : '-' }}</p>
          <p><span class="text-gray-400">Devis:</span> {{ selectedInvoice.quoteId ? quotesById.get(selectedInvoice.quoteId)?.number || '-' : '-' }}</p>
          <p><span class="text-gray-400">Montant:</span> {{ formatAmount(selectedInvoice.totalCents ?? selectedInvoice.amountCents, selectedInvoice.currency) }}</p>
          <p><span class="text-gray-400">Sous-total:</span> {{ formatAmount(selectedInvoice.subtotalCents ?? selectedInvoice.amountCents, selectedInvoice.currency) }}</p>
          <p><span class="text-gray-400">TVA:</span> {{ formatAmount(selectedInvoice.taxCents ?? 0, selectedInvoice.currency) }}</p>
          <p><span class="text-gray-400">Statut:</span> {{ selectedInvoice.status }}</p>
          <p><span class="text-gray-400">Emission:</span> {{ selectedInvoice.issuedAt || '-' }}</p>
          <p><span class="text-gray-400">Echeance:</span> {{ selectedInvoice.dueAt || '-' }}</p>
          <p><span class="text-gray-400">Paye le:</span> {{ selectedInvoice.paidAt || '-' }}</p>
        </div>
        <p class="text-xs text-gray-500 mt-4 whitespace-pre-wrap">{{ selectedInvoice.notes || 'Aucune note' }}</p>
      </template>
      <p v-else class="text-sm text-gray-400">Selectionne une facture.</p>
    </div>
    </div>
    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div class="absolute inset-0 bg-black/40" @click="showForm=false" />
        <form class="admin-modal-panel relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#111118] rounded-xl p-4 sm:p-5 space-y-3" @submit.prevent="submit">
          <input v-model="form.number" class="input-field" placeholder="Numero" required>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select v-model.number="form.clientId" class="input-field" :disabled="!!form.quoteId">
              <option :value="null">Aucun client</option>
              <option v-for="c in clients.clients" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <select v-model.number="form.quoteId" class="input-field">
              <option :value="null">Aucun devis</option>
              <option v-for="q in filteredQuotes" :key="q.id" :value="q.id">{{ q.number }} - {{ q.title }}</option>
            </select>
          </div>
          <input v-model="form.currency" class="input-field" placeholder="Devise">
          <div class="space-y-2 border border-gray-200 dark:border-white/[0.08] rounded-lg p-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase text-gray-400">Lignes</p>
              <button type="button" class="text-xs text-violet-600" @click="addItem">Ajouter</button>
            </div>
            <div v-for="(item, idx) in formItems" :key="idx" class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <input v-model="item.label" class="input-field sm:col-span-4" placeholder="Libelle">
              <input v-model.number="item.quantity" type="number" step="0.1" min="0" class="input-field sm:col-span-2" placeholder="Qt">
              <input v-model.number="item.unitPriceCents" type="number" min="0" class="input-field sm:col-span-3" placeholder="Prix (cts)">
              <input v-model.number="item.taxRate" type="number" step="0.1" min="0" class="input-field sm:col-span-2" placeholder="TVA %">
              <button type="button" class="text-xs text-red-500 sm:col-span-1 h-10" @click="removeItem(idx)">x</button>
              <input v-model="item.description" class="input-field sm:col-span-12" placeholder="Description (optionnel)">
            </div>
            <div class="pt-2 text-xs text-gray-500 space-y-1">
              <p>Sous-total: {{ formatAmount(draftTotals.subtotalCents, form.currency) }}</p>
              <p>TVA: {{ formatAmount(draftTotals.taxCents, form.currency) }}</p>
              <p class="font-semibold">Total: {{ formatAmount(draftTotals.totalCents, form.currency) }}</p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input v-model="form.issuedAt" type="date" class="input-field">
            <input v-model="form.dueAt" type="date" class="input-field">
            <input v-model="form.paidAt" type="date" class="input-field">
          </div>
          <select v-model="form.status" class="input-field">
            <option value="draft">draft</option>
            <option value="sent">sent</option>
            <option value="paid">paid</option>
            <option value="overdue">overdue</option>
            <option value="cancelled">cancelled</option>
          </select>
          <textarea v-model="form.notes" rows="3" class="input-field" placeholder="Notes" />
          <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end gap-2">
            <button type="button" class="px-3 py-2 text-sm" @click="showForm=false">Annuler</button>
            <button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Enregistrer</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
