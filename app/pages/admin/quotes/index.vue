<script setup lang="ts">
import type { Quote } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useQuotesStore()
const clients = useClientsStore()
const route = useRoute()
const toast = useToast()

const showForm = ref(false)
const editing = ref<Quote | null>(null)
const form = reactive({
  number: '',
  clientId: null as number | null,
  title: '',
  amountCents: 0,
  currency: 'CHF',
  status: 'draft' as Quote['status'],
  issuedAt: '',
  validUntil: '',
  notes: '',
  items: [] as Array<{ label: string, description: string | null, quantity: number, unitPriceCents: number, taxRate: number }>,
})

const clientsById = computed(() => new Map(clients.clients.map(c => [c.id, c])))
const selectedId = ref<number | null>(null)
const selectedQuote = computed(() => store.quotes.find(q => q.id === selectedId.value) ?? null)

function formatAmount(amountCents: number, currency: string) {
  return `${(amountCents / 100).toFixed(2)} ${currency}`
}

function openNew() {
  editing.value = null
  Object.assign(form, {
    number: '',
    clientId: null,
    title: '',
    amountCents: 0,
    currency: 'CHF',
    status: 'draft',
    issuedAt: '',
    validUntil: '',
    notes: '',
    items: [{ label: 'Prestation', description: null, quantity: 1, unitPriceCents: 0, taxRate: 8.1 }],
  })
  showForm.value = true
}

function openEdit(q: Quote) {
  editing.value = q
  Object.assign(form, q)
  showForm.value = true
}

async function submit() {
  try {
    const totals = computeFormTotals(form.items)
    const payload = {
      ...form,
      amountCents: totals.totalCents,
      issuedAt: form.issuedAt || null,
      validUntil: form.validUntil || null,
      notes: form.notes || null,
    }
    if (editing.value) await store.update(editing.value.id, payload as any)
    else await store.add(payload as any)
    showForm.value = false
    toast.success('Devis enregistre')
    if (!selectedId.value && store.quotes.length) selectedId.value = store.quotes[0].id
  } catch {
    toast.error('Erreur')
  }
}
function computeFormTotals(items: Array<{ quantity: number, unitPriceCents: number, taxRate: number }>) {
  const subtotalCents = items.reduce((acc, item) => acc + Math.round((Number(item.quantity) || 0) * (Number(item.unitPriceCents) || 0)), 0)
  const totalCents = items.reduce((acc, item) => {
    const line = Math.round((Number(item.quantity) || 0) * (Number(item.unitPriceCents) || 0))
    return acc + Math.round(line * (1 + (Number(item.taxRate) || 0) / 100))
  }, 0)
  return { subtotalCents, taxCents: Math.max(0, totalCents - subtotalCents), totalCents }
}
function addItem() {
  form.items.push({ label: '', description: null, quantity: 1, unitPriceCents: 0, taxRate: 8.1 })
}
function removeItem(idx: number) {
  form.items.splice(idx, 1)
}
const draftTotals = computed(() => computeFormTotals(form.items))

async function del(id: number) {
  if (!confirm('Supprimer ce devis ?')) return
  try {
    await store.remove(id)
    if (selectedId.value === id) selectedId.value = store.quotes[0]?.id ?? null
    toast.success('Supprime')
  } catch {
    toast.error('Erreur')
  }
}

function escapeCsv(value: string | number | null | undefined) {
  const str = value == null ? '' : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

function exportCsv() {
  const header = ['Numero', 'Client', 'Titre', 'Montant', 'Devise', 'Statut', 'Emission', 'ValideJusquau', 'Notes']
  const rows = store.quotes.map(q => [
    q.number,
    q.clientId ? (clientsById.value.get(q.clientId)?.name || '') : '',
    q.title,
    (q.amountCents / 100).toFixed(2),
    q.currency,
    q.status,
    q.issuedAt || '',
    q.validUntil || '',
    q.notes || '',
  ])
  const content = [header, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `devis-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function printSelected() {
  if (!selectedQuote.value) {
    toast.error('Selectionne un devis')
    return
  }
  const q = selectedQuote.value
  const client = q.clientId ? (clientsById.value.get(q.clientId)?.name || '-') : '-'
  const html = `
    <html>
      <head><title>Devis ${q.number}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
        <h1 style="margin:0 0 16px;">Devis ${q.number}</h1>
        <p><strong>Client:</strong> ${client}</p>
        <p><strong>Titre:</strong> ${q.title}</p>
        <p><strong>Montant:</strong> ${formatAmount(q.amountCents, q.currency)}</p>
        <p><strong>Statut:</strong> ${q.status}</p>
        <p><strong>Emission:</strong> ${q.issuedAt || '-'}</p>
        <p><strong>Valide jusqu'au:</strong> ${q.validUntil || '-'}</p>
        <p><strong>Notes:</strong><br/>${(q.notes || '-').replace(/\n/g, '<br/>')}</p>
      </body>
    </html>
  `
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}
function downloadPdf() {
  if (!selectedQuote.value) {
    toast.error('Selectionne un devis')
    return
  }
  window.open(`/api/quotes/pdf?id=${selectedQuote.value.id}`, '_blank')
}

onMounted(async () => {
  await Promise.all([store.ensureLoaded(), clients.ensureLoaded()])
  if (route.query.new === '1') {
    openNew()
    const id = Number(route.query.clientId || 0)
    if (id) form.clientId = id
  }
  if (store.quotes.length) selectedId.value = store.quotes[0].id
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-display font-semibold text-xl">Devis</h1>
      <div class="flex items-center gap-2">
        <button class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="exportCsv">Exporter CSV</button>
        <button class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="printSelected">Imprimer</button>
        <button class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="downloadPdf">PDF</button>
        <button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm" @click="openNew">Nouveau</button>
      </div>
    </div>

    <div class="grid lg:grid-cols-[1fr_320px] gap-4">
      <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/[0.06]">
              <th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Numero</th>
              <th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Client</th>
              <th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Titre</th>
              <th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Montant</th>
              <th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Statut</th>
              <th class="text-right px-4 py-3 text-xs uppercase text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="q in store.quotes"
              :key="q.id"
              class="border-b border-gray-50 dark:border-white/[0.03] cursor-pointer"
              :class="selectedId === q.id ? 'bg-violet-50/60 dark:bg-violet-500/10' : ''"
              @click="selectedId = q.id"
            >
              <td class="px-4 py-3 text-sm">{{ q.number }}</td>
              <td class="px-4 py-3 text-sm">{{ q.clientId ? clientsById.get(q.clientId)?.name || '-' : '-' }}</td>
              <td class="px-4 py-3 text-sm">{{ q.title }}</td>
              <td class="px-4 py-3 text-sm">{{ formatAmount(q.amountCents, q.currency) }}</td>
              <td class="px-4 py-3 text-sm">{{ q.status }}</td>
              <td class="px-4 py-3 text-right space-x-2">
                <button class="text-xs text-violet-600" @click.stop="openEdit(q)">Editer</button>
                <button class="text-xs text-red-500" @click.stop="del(q.id)">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-4">
        <template v-if="selectedQuote">
          <p class="text-xs uppercase text-gray-400">Apercu</p>
          <h2 class="text-lg font-semibold mt-1">{{ selectedQuote.number }}</h2>
          <p class="text-sm text-gray-500 mt-1">{{ selectedQuote.title }}</p>
          <div class="mt-4 space-y-2 text-sm">
            <p><span class="text-gray-400">Client:</span> {{ selectedQuote.clientId ? clientsById.get(selectedQuote.clientId)?.name || '-' : '-' }}</p>
            <p><span class="text-gray-400">Montant:</span> {{ formatAmount(selectedQuote.totalCents ?? selectedQuote.amountCents, selectedQuote.currency) }}</p>
            <p><span class="text-gray-400">Sous-total:</span> {{ formatAmount(selectedQuote.subtotalCents ?? selectedQuote.amountCents, selectedQuote.currency) }}</p>
            <p><span class="text-gray-400">TVA:</span> {{ formatAmount(selectedQuote.taxCents ?? 0, selectedQuote.currency) }}</p>
            <p><span class="text-gray-400">Statut:</span> {{ selectedQuote.status }}</p>
            <p><span class="text-gray-400">Emission:</span> {{ selectedQuote.issuedAt || '-' }}</p>
            <p><span class="text-gray-400">Valide jusqu'au:</span> {{ selectedQuote.validUntil || '-' }}</p>
          </div>
          <p class="text-xs text-gray-500 mt-4 whitespace-pre-wrap">{{ selectedQuote.notes || 'Aucune note' }}</p>
        </template>
        <p v-else class="text-sm text-gray-400">Selectionne un devis.</p>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showForm=false" />
        <form class="relative w-full max-w-xl bg-white dark:bg-[#111118] rounded-xl p-5 space-y-3" @submit.prevent="submit">
          <input v-model="form.number" class="input-field" placeholder="Numero" required>
          <select v-model.number="form.clientId" class="input-field">
            <option :value="null">Aucun client</option>
            <option v-for="c in clients.clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <input v-model="form.title" class="input-field" placeholder="Titre" required>
          <input v-model="form.currency" class="input-field" placeholder="Devise">
          <div class="space-y-2 border border-gray-200 dark:border-white/[0.08] rounded-lg p-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase text-gray-400">Lignes</p>
              <button type="button" class="text-xs text-violet-600" @click="addItem">Ajouter</button>
            </div>
            <div v-for="(item, idx) in form.items" :key="idx" class="grid grid-cols-12 gap-2 items-center">
              <input v-model="item.label" class="input-field col-span-4" placeholder="Libelle">
              <input v-model.number="item.quantity" type="number" step="0.1" min="0" class="input-field col-span-2" placeholder="Qt">
              <input v-model.number="item.unitPriceCents" type="number" min="0" class="input-field col-span-3" placeholder="Prix (cts)">
              <input v-model.number="item.taxRate" type="number" step="0.1" min="0" class="input-field col-span-2" placeholder="TVA %">
              <button type="button" class="text-xs text-red-500 col-span-1" @click="removeItem(idx)">x</button>
              <input v-model="item.description" class="input-field col-span-12" placeholder="Description (optionnel)">
            </div>
            <div class="pt-2 text-xs text-gray-500 space-y-1">
              <p>Sous-total: {{ formatAmount(draftTotals.subtotalCents, form.currency) }}</p>
              <p>TVA: {{ formatAmount(draftTotals.taxCents, form.currency) }}</p>
              <p class="font-semibold">Total: {{ formatAmount(draftTotals.totalCents, form.currency) }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <input v-model="form.issuedAt" type="date" class="input-field">
            <input v-model="form.validUntil" type="date" class="input-field">
          </div>
          <select v-model="form.status" class="input-field">
            <option value="draft">draft</option>
            <option value="sent">sent</option>
            <option value="accepted">accepted</option>
            <option value="rejected">rejected</option>
          </select>
          <textarea v-model="form.notes" rows="3" class="input-field" placeholder="Notes" />
          <div class="flex justify-end gap-2">
            <button type="button" class="px-3 py-2 text-sm" @click="showForm=false">Annuler</button>
            <button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Enregistrer</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
