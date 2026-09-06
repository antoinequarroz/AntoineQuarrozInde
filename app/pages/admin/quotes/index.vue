<script setup lang="ts">
import type { Quote } from '~/types'
import { printStructuredDocument } from '~/utils/printStructuredDocument'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useQuotesStore()
const clients = useClientsStore()
const invoices = useInvoicesStore()
const projects = useProjectsStore()
const auth = useAuthStore()
const route = useRoute()
const toast = useToast()
const { statusLabel } = useBusinessLabels()

const showForm = ref(false)
const closeForm = () => { showForm.value = false }
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(showForm, closeForm)
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
  projectId: null as number | null,
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
const availableProjects = computed(() => form.clientId
  ? projects.projects.filter(project => !project.clientId || project.clientId === form.clientId)
  : projects.projects)
const selectedId = ref<number | null>(null)
const viewMode = ref<'table' | 'kanban'>('table')
const search = ref('')
const statusFilter = ref<'all' | Quote['status']>('all')
const runningAction = ref<string | null>(null)
const loadError = ref('')
const submitting = ref(false)
const selectedQuote = computed(() => store.quotes.find(q => q.id === selectedId.value) ?? null)
const quoteStatuses: Array<Quote['status']> = ['draft', 'sent', 'accepted', 'rejected']
const kanbanQuotes = computed(() =>
  quoteStatuses.map(status => ({
    status,
    items: filteredQuotes.value.filter(q => q.status === status),
  })),
)
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
  const detailsBlock = `---DEVISDETAILS---\n${details.join('\n')}\n---/DEVISDETAILS---`
  const metadataBlock = `---DEVISEXT---\n${JSON.stringify(quoteMeta)}\n---/DEVISEXT---`
  return `${userNotes}\n\n${detailsBlock}\n\n${metadataBlock}`.trim()
}

function extractUserNotes(source: string | null | undefined) {
  const raw = source || ''
  const withoutBlocks = raw
    .replace(/---DEVISDETAILS---\n[\s\S]*?\n---\/DEVISDETAILS---/g, '')
    .replace(/---DEVISEXT---\n[\s\S]*?\n---\/DEVISEXT---/g, '')
  const generatedLabels = ['Type projet:', 'Debut:', 'Livraison cible:', 'Jalons:', 'Acompte:', 'Paiement:', 'Revisions incluses:', 'Hebergement mensuel:', 'Nom de domaine annuel:', 'Formation incluse:', 'Support post-livraison:']
  return withoutBlocks.split('\n').filter(line => !generatedLabels.some(label => line.startsWith(label))).join('\n').trim()
}

function parseNotes(source: string | null | undefined) {
  const raw = source || ''
  const match = raw.match(/---DEVISEXT---\n([\s\S]*?)\n---\/DEVISEXT---/)
  if (!match) {
    form.notes = raw
    return
  }
  form.notes = extractUserNotes(raw)
  try {
    const parsed = JSON.parse(match[1] ?? '{}')
    Object.assign(quoteMeta, parsed)
  } catch {}
}

async function nextNumber() {
  try {
    return (await $fetch<{ number: string }>('/api/admin/billing/next-number', {
      query: { kind: 'quote' },
      headers: auth.authHeader(),
    })).number
  } catch {
    return ''
  }
}

async function openNew() {
  editing.value = null
  offerTemplate.value = 'custom'
  resetMeta()
  Object.assign(form, {
    number: await nextNumber(),
    clientId: null,
    projectId: null,
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
  submitting.value = true
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
    toast.success('Devis enregistré')
    if (!selectedId.value) selectedId.value = store.quotes.at(0)?.id ?? null
  } catch {
    toast.error('Le devis n’a pas pu être enregistré')
  }
  finally { submitting.value = false }
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
    toast.success('Devis supprimé')
  } catch {
    toast.error('Le devis n’a pas pu être supprimé')
  }
}

async function quickSetStatus(id: number, status: Quote['status']) {
  try {
    await store.update(id, { status } as any)
    toast.success(`Statut : ${statusLabel(status)}`)
  } catch {
    toast.error('Le statut n’a pas pu être modifié')
  }
}

function upsertNoteLine(source: string | null | undefined, key: string, value: string) {
  const lines = (source || '').split('\n').filter(Boolean)
  const prefix = `[${key}] `
  const next = lines.filter(line => !line.startsWith(prefix))
  next.push(`${prefix}${value}`)
  return next.join('\n').trim()
}

async function markQuoteEvent(q: Quote, event: 'sent_at' | 'viewed_at' | 'signed_at') {
  try {
    const now = new Date().toISOString()
    const notes = upsertNoteLine(q.notes, event, now)
    const patch: Partial<Quote> = { notes }
    if (event === 'sent_at') patch.status = 'sent'
    if (event === 'signed_at') patch.status = 'accepted'
    await store.update(q.id, patch as any)
    toast.success('Événement enregistré')
  } catch {
    toast.error('L’événement n’a pas pu être enregistré')
  }
}

async function sendQuoteEmail(q: Quote) {
  runningAction.value = `send-${q.id}`
  try {
    await $fetch('/api/quotes/send', { method: 'POST', body: { id: q.id }, headers: auth.authHeader() })
    await store.ensureLoaded(true)
    toast.success(`Devis ${q.number} envoyé avec son PDF`)
  } catch (error: any) {
    toast.error(error?.data?.message || 'Impossible d’envoyer le devis')
  } finally {
    runningAction.value = null
  }
}

async function convertToInvoice(q: Quote) {
  runningAction.value = `convert-${q.id}`
  try {
    const result = await $fetch<{ created: boolean, invoice: { number: string } }>('/api/quotes/convert', {
      method: 'POST', body: { id: q.id }, headers: auth.authHeader(),
    })
    await Promise.all([store.ensureLoaded(true), invoices.ensureLoaded(true)])
    toast.success(result.created ? `Facture ${result.invoice.number} créée` : `La facture ${result.invoice.number} existe déjà`)
    await navigateTo('/admin/invoices')
  } catch (error: any) {
    toast.error(error?.data?.message || 'Impossible de créer la facture')
  } finally {
    runningAction.value = null
  }
}

async function duplicateQuote(q: Quote) {
  editing.value = null
  resetMeta()
  parseNotes(q.notes)
  Object.assign(form, {
    ...q,
    number: await nextNumber(),
    status: 'draft',
    issuedAt: new Date().toISOString().slice(0, 10),
    items: (q.items || []).map(item => ({ ...item, id: undefined })),
  })
  showForm.value = true
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
  const opened = printStructuredDocument({
    title: `Devis ${q.number}`,
    heading: `Devis ${q.number}`,
    fields: [
      { label: 'Client', value: client },
      { label: 'Titre', value: q.title },
      { label: 'Montant', value: formatAmount(q.amountCents, q.currency) },
      { label: 'Statut', value: statusLabel(q.status) },
      { label: 'Émission', value: q.issuedAt || '-' },
      { label: 'Valide jusqu’au', value: q.validUntil || '-' },
      { label: 'Notes', value: extractUserNotes(q.notes) || '-', multiline: true },
    ],
  })
  if (!opened) toast.error('Autorise les fenêtres surgissantes pour imprimer ce devis.')
}
function downloadPdf() {
  if (!selectedQuote.value) {
    toast.error('Sélectionne un devis')
    return
  }
  window.open(`/api/quotes/pdf?id=${selectedQuote.value.id}`, '_blank')
}

async function loadQuotes(force = false) {
  loadError.value = ''
  try { await Promise.all([store.ensureLoaded(force), clients.ensureLoaded(force), projects.ensureLoaded(force)]) }
  catch { loadError.value = 'Les devis ne peuvent pas être chargés. Réessaie dans quelques instants.' }
}

onMounted(async () => {
  await loadQuotes()
  if (route.query.new === '1') {
    await openNew()
    const id = Number(route.query.clientId || 0)
    if (id) form.clientId = id
    const projectId = Number(route.query.projectId || 0)
    if (projectId) {
      form.projectId = projectId
      const project = projects.projects.find(item => item.id === projectId)
      if (project?.clientId) form.clientId = project.clientId
    }
  }
  const qStatus = String(route.query.status || '')
  if (qStatus === 'draft' || qStatus === 'sent' || qStatus === 'accepted' || qStatus === 'rejected') statusFilter.value = qStatus
  const qSearch = String(route.query.search || '')
  if (qSearch) search.value = qSearch
  const quoteId = Number(route.query.quoteId || 0)
  selectedId.value = store.quotes.some(quote => quote.id === quoteId)
    ? quoteId
    : (quoteId > 0 ? null : (store.quotes.at(0)?.id ?? null))
})
</script>

<template>
  <div class="space-y-5">
    <section class="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Devis</span>
          <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Devis</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Crée, envoie et suis tes devis jusqu’à la signature.</p>
        </div>
        <div class="admin-page-actions flex flex-wrap items-center gap-2">
          <button class="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]" @click="exportCsv">Exporter CSV</button>
          <button class="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]" @click="printSelected">Imprimer</button>
          <button class="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]" @click="downloadPdf">PDF</button>
          <button class="inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-brand px-4 text-sm font-semibold text-white shadow-glow-sm transition hover:opacity-90" @click="openNew">Nouveau devis</button>
        </div>
      </div>
    </section>
    <div v-if="store.loading && !store.loaded" role="status" class="grid min-h-48 place-items-center rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]"><div class="text-center"><div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /><p class="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement des devis…</p></div></div>
    <div v-else-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100"><p class="font-semibold">Les devis sont indisponibles</p><p class="mt-1 text-sm">{{ loadError }}</p><button type="button" class="mt-4 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white" @click="loadQuotes(true)">Réessayer</button></div>

    <div v-if="!store.loading && !loadError" class="grid grid-cols-1 gap-2 rounded-xl border border-gray-100 bg-white p-3 dark:border-white/[0.06] dark:bg-[#111118] sm:grid-cols-[1fr_170px]">
      <label for="quote-search" class="sr-only">Rechercher un devis</label><input id="quote-search" v-model="search" type="search" class="input-field" placeholder="Rechercher un devis…">
      <label for="quote-status-filter" class="sr-only">Filtrer les devis par statut</label><select id="quote-status-filter" v-model="statusFilter" class="input-field">
        <option value="all">Tous les statuts</option>
        <option value="draft">{{ statusLabel('draft') }}</option>
        <option value="sent">{{ statusLabel('sent') }}</option>
        <option value="accepted">{{ statusLabel('accepted') }}</option>
        <option value="rejected">{{ statusLabel('rejected') }}</option>
      </select>
      <div class="sm:col-span-2 flex items-center gap-2 pt-1">
        <button class="min-h-11 rounded-lg border px-3 text-xs font-semibold" :aria-pressed="viewMode === 'table'" :class="viewMode==='table' ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 dark:border-white/[0.12]'" @click="viewMode='table'">Tableau</button>
        <button class="min-h-11 rounded-lg border px-3 text-xs font-semibold" :aria-pressed="viewMode === 'kanban'" :class="viewMode==='kanban' ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 dark:border-white/[0.12]'" @click="viewMode='kanban'">Kanban</button>
      </div>
    </div>

    <div v-if="!store.loading && !loadError" class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="space-y-3">
        <div v-if="viewMode==='kanban'" class="grid grid-cols-1 xl:grid-cols-4 gap-3">
          <div v-for="col in kanbanQuotes" :key="`q-col-${col.status}`" class="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111118] p-3 space-y-2">
            <p class="text-xs uppercase text-gray-600 dark:text-gray-300">{{ statusLabel(col.status) }} ({{ col.items.length }})</p>
            <article
              v-for="q in col.items"
              :key="`kanban-${q.id}`"
              class="rounded-lg border border-gray-100 p-2.5 dark:border-white/[0.08]"
            >
              <button type="button" class="block min-h-11 w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" @click="selectedId = q.id"><span class="block text-sm font-semibold">{{ q.number }}</span><span class="block truncate text-xs text-gray-500">{{ q.title }}</span><span class="mt-1 block text-xs">{{ formatAmount(q.amountCents, q.currency) }}</span></button>
              <div class="mt-2 flex flex-wrap gap-2">
                <button v-if="q.status!=='sent'" class="min-h-11 rounded-lg px-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300" @click="quickSetStatus(q.id,'sent')">Envoyer</button>
                <button v-if="q.status!=='accepted'" class="min-h-11 rounded-lg px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300" @click="quickSetStatus(q.id,'accepted')">Accepter</button>
                <button class="min-h-11 rounded-lg px-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300" @click="openEdit(q)">Modifier</button>
              </div>
            </article>
          </div>
        </div>

        <div class="sm:hidden space-y-2">
          <article
            v-for="q in filteredQuotes"
            :key="`mobile-${q.id}`"
            class="w-full rounded-xl border border-gray-100 bg-white p-3 dark:border-white/[0.06] dark:bg-[#111118]"
            :class="selectedId === q.id ? 'ring-1 ring-violet-500/60' : ''"
          >
            <button type="button" class="block min-h-11 w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" @click="selectedId = q.id"><span class="flex items-start justify-between gap-2"><strong class="text-sm">{{ q.number }}</strong><span class="text-xs font-semibold uppercase text-gray-500">{{ statusLabel(q.status) }}</span></span><span class="mt-1 block truncate text-sm text-gray-600 dark:text-gray-300">{{ q.title }}</span><span class="mt-1 block text-xs text-gray-500">{{ q.clientId ? clientsById.get(q.clientId)?.name || 'Client non renseigné' : 'Client non renseigné' }}</span><strong class="mt-2 block text-sm">{{ formatAmount(q.amountCents, q.currency) }}</strong></button>
            <div class="mt-3 grid grid-cols-3 gap-1 border-t border-gray-100 pt-3 dark:border-white/[0.06]">
              <button class="min-h-11 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300" @click="quickSetStatus(q.id, 'accepted')">Accepter</button>
              <button class="min-h-11 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300" @click="openEdit(q)">Modifier</button>
              <button class="min-h-11 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400" @click="del(q.id)">Supprimer</button>
            </div>
          </article>
        </div>

        <div v-if="viewMode==='table'" class="admin-table-wrap hidden sm:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
          <table class="admin-table w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/[0.06]">
              <th class="px-4 py-3 text-left text-xs uppercase text-gray-600 dark:text-gray-300">Numéro</th>
              <th class="px-4 py-3 text-left text-xs uppercase text-gray-600 dark:text-gray-300">Client</th>
              <th class="px-4 py-3 text-left text-xs uppercase text-gray-600 dark:text-gray-300">Titre</th>
              <th class="px-4 py-3 text-left text-xs uppercase text-gray-600 dark:text-gray-300">Montant</th>
              <th class="px-4 py-3 text-left text-xs uppercase text-gray-600 dark:text-gray-300">Statut</th>
              <th class="px-4 py-3 text-right text-xs uppercase text-gray-600 dark:text-gray-300">Actions</th>
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
              <td class="px-4 py-3 text-sm">{{ statusLabel(q.status) }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-1"><button class="min-h-11 rounded-lg px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300" @click.stop="quickSetStatus(q.id, 'accepted')">Accepter</button><button class="min-h-11 rounded-lg px-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300" @click.stop="quickSetStatus(q.id, 'sent')">Marquer envoyé</button><button class="min-h-11 rounded-lg px-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300" @click.stop="openEdit(q)">Modifier</button><button class="min-h-11 rounded-lg px-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400" @click.stop="del(q.id)">Supprimer</button></div>
              </td>
            </tr>
          </tbody>
          </table>
        </div>
      </div>

      <div class="hidden lg:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-4 lg:sticky lg:top-20">
        <template v-if="selectedQuote">
          <p class="text-xs uppercase text-gray-600 dark:text-gray-300">Aperçu</p>
          <h2 class="text-lg font-semibold mt-1">{{ selectedQuote.number }}</h2>
          <p class="text-sm text-gray-500 mt-1">{{ selectedQuote.title }}</p>
          <div class="mt-4 space-y-2 text-sm">
            <p><span class="text-gray-600 dark:text-gray-300">Client :</span> {{ selectedQuote.clientId ? clientsById.get(selectedQuote.clientId)?.name || '-' : '-' }}</p>
            <p><span class="text-gray-600 dark:text-gray-300">Montant :</span> {{ formatAmount(selectedQuote.totalCents ?? selectedQuote.amountCents, selectedQuote.currency) }}</p>
            <p><span class="text-gray-600 dark:text-gray-300">Sous-total :</span> {{ formatAmount(selectedQuote.subtotalCents ?? selectedQuote.amountCents, selectedQuote.currency) }}</p>
            <p><span class="text-gray-600 dark:text-gray-300">TVA :</span> {{ formatAmount(selectedQuote.taxCents ?? 0, selectedQuote.currency) }}</p>
            <p><span class="text-gray-600 dark:text-gray-300">Statut :</span> {{ statusLabel(selectedQuote.status) }}</p>
            <p><span class="text-gray-600 dark:text-gray-300">Émission :</span> {{ selectedQuote.issuedAt || '-' }}</p>
            <p><span class="text-gray-600 dark:text-gray-300">Valide jusqu’au :</span> {{ selectedQuote.validUntil || '-' }}</p>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <button class="min-h-11 rounded-lg border border-gray-200 px-2 text-xs dark:border-white/[0.12] disabled:opacity-50" :disabled="runningAction === `send-${selectedQuote.id}`" @click="sendQuoteEmail(selectedQuote)">{{ runningAction === `send-${selectedQuote.id}` ? 'Envoi…' : 'Envoyer avec PDF' }}</button>
            <button class="min-h-11 rounded-lg border border-gray-200 px-2 text-xs dark:border-white/[0.12]" @click="markQuoteEvent(selectedQuote, 'sent_at')">Marquer envoyé</button>
            <button class="min-h-11 rounded-lg border border-gray-200 px-2 text-xs dark:border-white/[0.12]" @click="markQuoteEvent(selectedQuote, 'viewed_at')">Marquer vu</button>
            <button class="min-h-11 rounded-lg border border-emerald-300/60 px-2 text-xs text-emerald-700" @click="markQuoteEvent(selectedQuote, 'signed_at')">Marquer signé</button>
            <button class="min-h-11 rounded-lg border border-gray-200 px-2 text-xs dark:border-white/[0.12]" @click="duplicateQuote(selectedQuote)">Dupliquer</button>
            <button class="col-span-2 min-h-11 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white disabled:opacity-50" :disabled="runningAction === `convert-${selectedQuote.id}`" @click="convertToInvoice(selectedQuote)">{{ runningAction === `convert-${selectedQuote.id}` ? 'Création…' : 'Créer la facture' }}</button>
          </div>
          <p class="mt-4 whitespace-pre-wrap break-words text-xs text-gray-500">{{ extractUserNotes(selectedQuote.notes) || 'Aucune note' }}</p>
        </template>
        <p v-else class="text-sm text-gray-600 dark:text-gray-300">Sélectionne un devis.</p>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="showForm" ref="dialogRef" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="quote-form-title" tabindex="-1" @keydown="handleDialogKeydown">
        <div class="absolute inset-0 bg-black/40" @click="showForm=false" />
        <form class="admin-modal-panel relative my-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl space-y-4 overflow-x-hidden overflow-y-auto rounded-xl bg-white p-4 dark:bg-[#111118] sm:p-5" @submit.prevent="submit">
          <h2 id="quote-form-title" class="font-display text-lg font-semibold text-gray-900 dark:text-white">{{ editing ? 'Modifier le devis' : 'Nouveau devis' }}</h2>
          <div><label for="quote-number" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Numéro *</label><input id="quote-number" v-model="form.number" class="input-field" placeholder="DEV-2026-0001" required></div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Client
              <select v-model.number="form.clientId" class="input-field">
                <option :value="null">Aucun client</option>
                <option v-for="c in clients.clients" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Projet
              <select v-model.number="form.projectId" class="input-field">
                <option :value="null">Aucun projet</option>
                <option v-for="project in availableProjects" :key="project.id" :value="project.id">{{ project.title }}</option>
              </select>
            </label>
          </div>
          <div><label for="quote-title" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Titre *</label><input id="quote-title" v-model="form.title" class="input-field" placeholder="Ex. Création du site vitrine" required></div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Modèle de prestation<select v-model="offerTemplate" class="input-field">
              <option value="custom">Template libre</option>
              <option value="vitrine">Site vitrine</option>
              <option value="ecommerce">Site e-commerce</option>
              <option value="landing">Landing page</option>
              <option value="maintenance">Maintenance mensuelle</option>
            </select></label>
            <button type="button" class="min-h-11 self-end rounded-lg border border-gray-200 px-3 text-sm font-semibold dark:border-white/[0.12]" @click="applyTemplate">Appliquer le modèle</button>
          </div>
          <label class="block space-y-1 text-xs text-gray-500">Devise
            <select v-model="form.currency" class="input-field"><option value="CHF">CHF</option><option value="EUR">EUR</option></select>
          </label>
          <div class="space-y-2 border border-gray-200 dark:border-white/[0.08] rounded-lg p-3">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Calendrier du projet</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Début prévu<input v-model="quoteMeta.projectStart" type="date" class="input-field"></label>
              <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Livraison cible<input v-model="quoteMeta.projectDelivery" type="date" class="input-field"></label>
            </div>
            <textarea v-model="quoteMeta.milestones" rows="2" class="input-field" placeholder="Jalons (ex: S1 cadrage, S2 design, S3 dev, S4 recette)" />
          </div>
          <div class="space-y-2 border border-gray-200 dark:border-white/[0.08] rounded-lg p-3">
            <p class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Conditions commerciales</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Acompte (%)<input v-model.number="quoteMeta.depositPercent" type="number" min="0" max="100" class="input-field"></label>
              <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Délai de paiement (jours)<input v-model.number="quoteMeta.paymentTermsDays" type="number" min="0" class="input-field"></label>
              <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Révisions incluses<input v-model.number="quoteMeta.revisionsIncluded" type="number" min="0" class="input-field"></label>
              <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Support (mois)<input v-model.number="quoteMeta.supportMonths" type="number" min="0" class="input-field"></label>
              <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Hébergement mensuel (centimes)<input v-model.number="quoteMeta.monthlyHostingCents" type="number" min="0" class="input-field"></label>
              <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Domaine annuel (centimes)<input v-model.number="quoteMeta.domainYearlyCents" type="number" min="0" class="input-field"></label>
            </div>
            <label class="flex items-center gap-2 text-xs text-gray-500"><input v-model="quoteMeta.trainingIncluded" type="checkbox"> Formation incluse</label>
          </div>
          <div class="space-y-2 border border-gray-200 dark:border-white/[0.08] rounded-lg p-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase text-gray-400">Lignes</p>
              <button type="button" class="min-h-11 rounded-lg px-3 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300" @click="addItem">Ajouter une ligne</button>
            </div>
            <div v-for="(item, idx) in form.items" :key="idx" class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center min-w-0">
              <input v-model="item.label" class="input-field sm:col-span-4" :aria-label="`Libellé de la ligne ${idx + 1}`" placeholder="Libellé">
              <input v-model.number="item.quantity" type="number" step="0.1" min="0" class="input-field sm:col-span-2" :aria-label="`Quantité de la ligne ${idx + 1}`" placeholder="Quantité">
              <input v-model.number="item.unitPriceCents" type="number" min="0" class="input-field sm:col-span-3" :aria-label="`Prix en centimes de la ligne ${idx + 1}`" placeholder="Prix (centimes)">
              <input v-model.number="item.taxRate" type="number" step="0.1" min="0" class="input-field sm:col-span-2" :aria-label="`TVA de la ligne ${idx + 1}`" placeholder="TVA %">
              <button type="button" class="min-h-11 w-full rounded-lg border border-red-200/70 text-xs font-semibold text-red-600 dark:border-red-400/25 dark:text-red-400 sm:col-span-1" :aria-label="`Supprimer la ligne ${idx + 1}`" @click="removeItem(idx)">×</button>
              <input v-model="item.description" class="input-field sm:col-span-12" :aria-label="`Description de la ligne ${idx + 1}`" placeholder="Description (optionnel)">
            </div>
            <div class="pt-2 text-xs text-gray-500 space-y-1">
              <p>Sous-total : {{ formatAmount(draftTotals.subtotalCents, form.currency) }}</p>
              <p>TVA : {{ formatAmount(draftTotals.taxCents, form.currency) }}</p>
              <p class="font-semibold">Total : {{ formatAmount(draftTotals.totalCents, form.currency) }}</p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Date d’émission<input v-model="form.issuedAt" type="date" class="input-field"></label>
            <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Valide jusqu’au<input v-model="form.validUntil" type="date" class="input-field"></label>
          </div>
          <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Statut<select v-model="form.status" class="input-field">
            <option value="draft">{{ statusLabel('draft') }}</option>
            <option value="sent">{{ statusLabel('sent') }}</option>
            <option value="accepted">{{ statusLabel('accepted') }}</option>
            <option value="rejected">{{ statusLabel('rejected') }}</option>
          </select></label>
          <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Notes visibles<textarea v-model="form.notes" rows="3" class="input-field" placeholder="Conditions ou informations complémentaires" /></label>
          <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end gap-2">
            <button type="button" class="min-h-11 rounded-lg px-4 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]" @click="showForm=false">Annuler</button>
            <button class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60" :disabled="submitting">{{ submitting ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
