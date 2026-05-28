<script setup lang="ts">
import type { Quote } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useQuotesStore()
const clients = useClientsStore()
const route = useRoute()
const toast = useToast()

const showForm = ref(false)
const editing = ref<Quote | null>(null)
const offerTemplate = ref<'custom' | 'vitrine' | 'ecommerce' | 'landing' | 'maintenance'>('custom')
const quoteMeta = reactive({
  projectType: 'Site vitrine',
  projectStart: '',
  projectDelivery: '',
  paymentTermsDays: 30,
  depositPercent: 40,
  revisionsIncluded: 2,
  monthlyHostingCents: 2900,
  domainYearlyCents: 1500,
  trainingIncluded: true,
  supportMonths: 1,
  milestones: '',
})
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
const search = ref('')
const statusFilter = ref<'all' | Quote['status']>('all')
const selectedQuote = computed(() => store.quotes.find(q => q.id === selectedId.value) ?? null)
const filteredQuotes = computed(() => {
  const q = search.value.trim().toLowerCase()
  return store.quotes.filter((x) => {
    const byStatus = statusFilter.value === 'all' || x.status === statusFilter.value
    if (!byStatus) return false
    if (!q) return true
    return [x.number, x.title, x.notes || '', clientsById.value.get(x.clientId || 0)?.name || ''].join(' ').toLowerCase().includes(q)
  })
})

function formatAmount(amountCents: number, currency: string) {
  return `${(amountCents / 100).toFixed(2)} ${currency}`
}

function resetMeta() {
  Object.assign(quoteMeta, {
    projectType: 'Site vitrine',
    projectStart: '',
    projectDelivery: '',
    paymentTermsDays: 30,
    depositPercent: 40,
    revisionsIncluded: 2,
    monthlyHostingCents: 2900,
    domainYearlyCents: 1500,
    trainingIncluded: true,
    supportMonths: 1,
    milestones: '',
  })
}

function buildTemplateItems(template: typeof offerTemplate.value) {
  const vat = 8.1
  if (template === 'vitrine') {
    return [
      { label: 'Atelier cadrage & arborescence', description: 'Objectifs, structure, contenus', quantity: 1, unitPriceCents: 35000, taxRate: vat },
      { label: 'Design UI sur mesure', description: 'Maquettes desktop + mobile', quantity: 1, unitPriceCents: 120000, taxRate: vat },
      { label: 'Développement Nuxt', description: 'Pages, animations, responsive, SEO de base', quantity: 1, unitPriceCents: 195000, taxRate: vat },
      { label: 'Mise en ligne & QA', description: 'Tests, optimisations, déploiement', quantity: 1, unitPriceCents: 45000, taxRate: vat },
    ]
  }
  if (template === 'ecommerce') {
    return [
      { label: 'Atelier cadrage e-commerce', description: 'Catalogue, parcours, paiement', quantity: 1, unitPriceCents: 50000, taxRate: vat },
      { label: 'Design UI boutique', description: 'Fiches produit, panier, checkout', quantity: 1, unitPriceCents: 160000, taxRate: vat },
      { label: 'Développement boutique', description: 'Catalogue, filtres, tunnel d achat', quantity: 1, unitPriceCents: 320000, taxRate: vat },
      { label: 'Configuration paiement & livraison', description: 'Stripe, taxes, transporteurs', quantity: 1, unitPriceCents: 90000, taxRate: vat },
    ]
  }
  if (template === 'landing') {
    return [
      { label: 'Structure & copy assist', description: 'Positionnement, sections, CTA', quantity: 1, unitPriceCents: 30000, taxRate: vat },
      { label: 'Design landing', description: 'UI orientée conversion', quantity: 1, unitPriceCents: 70000, taxRate: vat },
      { label: 'Intégration + tracking', description: 'Formulaire, analytics, événements', quantity: 1, unitPriceCents: 110000, taxRate: vat },
    ]
  }
  if (template === 'maintenance') {
    return [
      { label: 'Maintenance corrective', description: 'Corrections techniques mensuelles', quantity: 1, unitPriceCents: 45000, taxRate: vat },
      { label: 'Maintenance évolutive', description: 'Petites évolutions / optimisations', quantity: 1, unitPriceCents: 55000, taxRate: vat },
      { label: 'Monitoring & sauvegardes', description: 'Surveillance et reprises', quantity: 1, unitPriceCents: 25000, taxRate: vat },
    ]
  }
  return [{ label: 'Prestation', description: null, quantity: 1, unitPriceCents: 0, taxRate: vat }]
}

function applyTemplate() {
  form.items = buildTemplateItems(offerTemplate.value)
}

function composeNotes() {
  const details = [
    `Type projet: ${quoteMeta.projectType}`,
    `Debut: ${quoteMeta.projectStart || '-'}`,
    `Livraison cible: ${quoteMeta.projectDelivery || '-'}`,
    `Jalons: ${quoteMeta.milestones || '-'}`,
    `Acompte: ${quoteMeta.depositPercent}%`,
    `Paiement: ${quoteMeta.paymentTermsDays} jours`,
    `Revisions incluses: ${quoteMeta.revisionsIncluded}`,
    `Hebergement mensuel: ${(quoteMeta.monthlyHostingCents / 100).toFixed(2)} ${form.currency}`,
    `Nom de domaine annuel: ${(quoteMeta.domainYearlyCents / 100).toFixed(2)} ${form.currency}`,
    `Formation incluse: ${quoteMeta.trainingIncluded ? 'oui' : 'non'}`,
    `Support post-livraison: ${quoteMeta.supportMonths} mois`,
  ]
  const userNotes = form.notes.trim()
  const block = `---DEVISEXT---\n${JSON.stringify(quoteMeta)}\n---/DEVISEXT---`
  return `${userNotes}\n\n${details.join('\n')}\n\n${block}`.trim()
}

function parseNotes(source: string | null | undefined) {
  const raw = source || ''
  const match = raw.match(/---DEVISEXT---\n([\s\S]*?)\n---\/DEVISEXT---/)
  if (!match) {
    form.notes = raw
    return
  }
  form.notes = raw.replace(match[0], '').trim()
  try {
    const parsed = JSON.parse(match[1])
    Object.assign(quoteMeta, parsed)
  } catch {}
}

function openNew() {
  editing.value = null
  offerTemplate.value = 'custom'
  resetMeta()
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
    items: buildTemplateItems('custom'),
  })
  showForm.value = true
}

function openEdit(q: Quote) {
  editing.value = q
  Object.assign(form, q)
  parseNotes(q.notes)
  if (!Array.isArray(form.items) || !form.items.length) form.items = buildTemplateItems('custom')
  offerTemplate.value = 'custom'
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
      notes: composeNotes() || null,
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

async function quickSetStatus(id: number, status: Quote['status']) {
  try {
    await store.update(id, { status } as any)
    toast.success(`Statut: ${status}`)
  } catch {
    toast.error('Erreur statut')
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
  const qStatus = String(route.query.status || '')
  if (qStatus === 'draft' || qStatus === 'sent' || qStatus === 'accepted' || qStatus === 'rejected') statusFilter.value = qStatus
  const qSearch = String(route.query.search || '')
  if (qSearch) search.value = qSearch
  if (store.quotes.length) selectedId.value = store.quotes[0].id
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-display font-semibold text-xl">Devis</h1>
      <div class="admin-page-actions">
        <button class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="exportCsv">Exporter CSV</button>
        <button class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="printSelected">Imprimer</button>
        <button class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="downloadPdf">PDF</button>
        <button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm" @click="openNew">Nouveau</button>
      </div>
    </div>
    <div class="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111118] p-3 grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-2">
      <input v-model="search" class="input-field" placeholder="Rechercher devis...">
      <select v-model="statusFilter" class="input-field">
        <option value="all">Tous statuts</option>
        <option value="draft">draft</option>
        <option value="sent">sent</option>
        <option value="accepted">accepted</option>
        <option value="rejected">rejected</option>
      </select>
    </div>

    <div class="grid lg:grid-cols-[1fr_320px] gap-4">
      <div class="space-y-3">
        <div class="sm:hidden space-y-2">
          <button
            v-for="q in filteredQuotes"
            :key="`mobile-${q.id}`"
            class="w-full rounded-xl border p-3 text-left bg-white dark:bg-[#111118] border-gray-100 dark:border-white/[0.06]"
            :class="selectedId === q.id ? 'ring-1 ring-violet-500/60' : ''"
            @click="selectedId = q.id"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-semibold">{{ q.number }}</p>
              <span class="text-[11px] uppercase text-gray-400">{{ q.status }}</span>
            </div>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-1">{{ q.title }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ q.clientId ? clientsById.get(q.clientId)?.name || '-' : '-' }}</p>
            <p class="mt-2 text-sm font-medium">{{ formatAmount(q.amountCents, q.currency) }}</p>
            <div class="mt-3 flex items-center gap-3">
              <button class="text-xs text-emerald-600" @click.stop="quickSetStatus(q.id, 'accepted')">Accepter</button>
              <button class="text-xs text-violet-600" @click.stop="openEdit(q)">Editer</button>
              <button class="text-xs text-red-500" @click.stop="del(q.id)">Supprimer</button>
            </div>
          </button>
        </div>

        <div class="admin-table-wrap hidden sm:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
          <table class="admin-table w-full">
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
              v-for="q in filteredQuotes"
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
                <button class="text-xs text-emerald-600" @click.stop="quickSetStatus(q.id, 'accepted')">Accepter</button>
                <button class="text-xs text-amber-600" @click.stop="quickSetStatus(q.id, 'sent')">Marquer envoye</button>
                <button class="text-xs text-violet-600" @click.stop="openEdit(q)">Editer</button>
                <button class="text-xs text-red-500" @click.stop="del(q.id)">Supprimer</button>
              </td>
            </tr>
          </tbody>
          </table>
        </div>
      </div>

      <div class="hidden lg:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-4 lg:sticky lg:top-20">
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
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div class="absolute inset-0 bg-black/40" @click="showForm=false" />
        <form class="admin-modal-panel relative w-full max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden bg-white dark:bg-[#111118] rounded-xl p-4 sm:p-5 space-y-3" @submit.prevent="submit">
          <input v-model="form.number" class="input-field" placeholder="Numero" required>
          <select v-model.number="form.clientId" class="input-field">
            <option :value="null">Aucun client</option>
            <option v-for="c in clients.clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <input v-model="form.title" class="input-field" placeholder="Titre" required>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select v-model="offerTemplate" class="input-field">
              <option value="custom">Template libre</option>
              <option value="vitrine">Site vitrine</option>
              <option value="ecommerce">Site e-commerce</option>
              <option value="landing">Landing page</option>
              <option value="maintenance">Maintenance mensuelle</option>
            </select>
            <button type="button" class="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.12] text-sm" @click="applyTemplate">Appliquer template</button>
          </div>
          <input v-model="form.currency" class="input-field" placeholder="Devise">
          <div class="space-y-2 border border-gray-200 dark:border-white/[0.08] rounded-lg p-3">
            <p class="text-xs font-semibold uppercase text-gray-400">Calendrier Projet</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input v-model="quoteMeta.projectStart" type="date" class="input-field">
              <input v-model="quoteMeta.projectDelivery" type="date" class="input-field">
            </div>
            <textarea v-model="quoteMeta.milestones" rows="2" class="input-field" placeholder="Jalons (ex: S1 cadrage, S2 design, S3 dev, S4 recette)" />
          </div>
          <div class="space-y-2 border border-gray-200 dark:border-white/[0.08] rounded-lg p-3">
            <p class="text-xs font-semibold uppercase text-gray-400">Conditions Commerciales</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input v-model.number="quoteMeta.depositPercent" type="number" min="0" max="100" class="input-field" placeholder="Acompte %">
              <input v-model.number="quoteMeta.paymentTermsDays" type="number" min="0" class="input-field" placeholder="Paiement (jours)">
              <input v-model.number="quoteMeta.revisionsIncluded" type="number" min="0" class="input-field" placeholder="Révisions incluses">
              <input v-model.number="quoteMeta.supportMonths" type="number" min="0" class="input-field" placeholder="Support (mois)">
              <input v-model.number="quoteMeta.monthlyHostingCents" type="number" min="0" class="input-field" placeholder="Hébergement mensuel (cts)">
              <input v-model.number="quoteMeta.domainYearlyCents" type="number" min="0" class="input-field" placeholder="Domaine annuel (cts)">
            </div>
            <label class="flex items-center gap-2 text-xs text-gray-500"><input v-model="quoteMeta.trainingIncluded" type="checkbox"> Formation incluse</label>
          </div>
          <div class="space-y-2 border border-gray-200 dark:border-white/[0.08] rounded-lg p-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase text-gray-400">Lignes</p>
              <button type="button" class="text-xs text-violet-600" @click="addItem">Ajouter</button>
            </div>
            <div v-for="(item, idx) in form.items" :key="idx" class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center min-w-0">
              <input v-model="item.label" class="input-field sm:col-span-4" placeholder="Libelle">
              <input v-model.number="item.quantity" type="number" step="0.1" min="0" class="input-field sm:col-span-2" placeholder="Qt">
              <input v-model.number="item.unitPriceCents" type="number" min="0" class="input-field sm:col-span-3" placeholder="Prix (cts)">
              <input v-model.number="item.taxRate" type="number" step="0.1" min="0" class="input-field sm:col-span-2" placeholder="TVA %">
              <button type="button" class="text-xs text-red-500 sm:col-span-1 h-10 rounded-lg border border-red-200/70 dark:border-red-400/25 w-full" @click="removeItem(idx)">Supprimer</button>
              <input v-model="item.description" class="input-field sm:col-span-12" placeholder="Description (optionnel)">
            </div>
            <div class="pt-2 text-xs text-gray-500 space-y-1">
              <p>Sous-total: {{ formatAmount(draftTotals.subtotalCents, form.currency) }}</p>
              <p>TVA: {{ formatAmount(draftTotals.taxCents, form.currency) }}</p>
              <p class="font-semibold">Total: {{ formatAmount(draftTotals.totalCents, form.currency) }}</p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end gap-2">
            <button type="button" class="px-3 py-2 text-sm" @click="showForm=false">Annuler</button>
            <button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Enregistrer</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
