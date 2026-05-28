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
function openNew() { editing.value = null; Object.assign(form, { number: '', clientId: null, quoteId: null, amountCents: 0, currency: 'CHF', status: 'draft', issuedAt: '', dueAt: '', paidAt: '', notes: '' }); showForm.value = true }
function openEdit(x: Invoice) { editing.value = x; Object.assign(form, x); showForm.value = true }
async function submit() { try { const payload = { ...form, issuedAt: form.issuedAt || null, dueAt: form.dueAt || null, paidAt: form.paidAt || null, notes: form.notes || null }; if (editing.value) await store.update(editing.value.id, payload as any); else await store.add(payload as any); showForm.value = false; toast.success('Enregistre') } catch { toast.error('Erreur') } }
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
    <div class="flex flex-wrap items-center justify-between gap-3"><h1 class="font-display font-semibold text-xl">Factures</h1><div class="flex items-center gap-2"><button class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="exportCsv">Exporter CSV</button><button class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="printSelected">Imprimer</button><button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm" @click="openNew">Nouvelle</button></div></div>
    <div class="grid lg:grid-cols-[1fr_320px] gap-4">
    <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="w-full">
        <thead><tr class="border-b border-gray-100 dark:border-white/[0.06]"><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Numero</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Client</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Devis</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Montant</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Echeance</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Statut</th><th class="text-right px-4 py-3 text-xs uppercase text-gray-400">Actions</th></tr></thead>
        <tbody><tr v-for="q in store.invoices" :key="q.id" class="border-b border-gray-50 dark:border-white/[0.03] cursor-pointer" :class="selectedId === q.id ? 'bg-violet-50/60 dark:bg-violet-500/10' : ''" @click="selectedId = q.id"><td class="px-4 py-3 text-sm">{{ q.number }}</td><td class="px-4 py-3 text-sm">{{ q.clientId ? clientsById.get(q.clientId)?.name || '-' : '-' }}</td><td class="px-4 py-3 text-sm">{{ q.quoteId ? quotesById.get(q.quoteId)?.number || '-' : '-' }}</td><td class="px-4 py-3 text-sm">{{ formatAmount(q.amountCents, q.currency) }}</td><td class="px-4 py-3 text-sm">{{ q.dueAt || '-' }}</td><td class="px-4 py-3 text-sm">{{ q.status }}</td><td class="px-4 py-3 text-right space-x-2"><button class="text-xs text-violet-600" @click.stop="openEdit(q)">Editer</button><button class="text-xs text-red-500" @click.stop="del(q.id)">Supprimer</button></td></tr></tbody>
      </table>
    </div>
    <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-4">
      <template v-if="selectedInvoice">
        <p class="text-xs uppercase text-gray-400">Apercu</p>
        <h2 class="text-lg font-semibold mt-1">{{ selectedInvoice.number }}</h2>
        <div class="mt-4 space-y-2 text-sm">
          <p><span class="text-gray-400">Client:</span> {{ selectedInvoice.clientId ? clientsById.get(selectedInvoice.clientId)?.name || '-' : '-' }}</p>
          <p><span class="text-gray-400">Devis:</span> {{ selectedInvoice.quoteId ? quotesById.get(selectedInvoice.quoteId)?.number || '-' : '-' }}</p>
          <p><span class="text-gray-400">Montant:</span> {{ formatAmount(selectedInvoice.amountCents, selectedInvoice.currency) }}</p>
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
    <Transition name="fade"><div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4"><div class="absolute inset-0 bg-black/40" @click="showForm=false"/><form class="relative w-full max-w-xl bg-white dark:bg-[#111118] rounded-xl p-5 space-y-3" @submit.prevent="submit"><input v-model="form.number" class="input-field" placeholder="Numero" required><select v-model.number="form.clientId" class="input-field" :disabled="!!form.quoteId"><option :value="null">Aucun client</option><option v-for="c in clients.clients" :key="c.id" :value="c.id">{{ c.name }}</option></select><select v-model.number="form.quoteId" class="input-field"><option :value="null">Aucun devis</option><option v-for="q in filteredQuotes" :key="q.id" :value="q.id">{{ q.number }} - {{ q.title }}</option></select><div class="grid grid-cols-2 gap-3"><input v-model.number="form.amountCents" type="number" min="0" class="input-field" placeholder="Montant (centimes)"><input v-model="form.currency" class="input-field" placeholder="Devise"></div><div class="grid grid-cols-3 gap-3"><input v-model="form.issuedAt" type="date" class="input-field"><input v-model="form.dueAt" type="date" class="input-field"><input v-model="form.paidAt" type="date" class="input-field"></div><select v-model="form.status" class="input-field"><option value="draft">draft</option><option value="sent">sent</option><option value="paid">paid</option><option value="overdue">overdue</option><option value="cancelled">cancelled</option></select><textarea v-model="form.notes" rows="3" class="input-field" placeholder="Notes"/><div class="flex justify-end gap-2"><button type="button" class="px-3 py-2 text-sm" @click="showForm=false">Annuler</button><button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Enregistrer</button></div></form></div></Transition>
  </div>
</template>
