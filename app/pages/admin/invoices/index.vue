<script setup lang="ts">
import type { Invoice } from '~/types'
import { generateScorReference, getQrReferenceError, isQrIban, isValidSwissIban, normalizeIban } from '~~/shared/utils/swissQr'
definePageMeta({ layout: 'admin', middleware: 'admin' })
const store = useInvoicesStore()
const clients = useClientsStore()
const quotes = useQuotesStore()
const auth = useAuthStore()
const { statusLabel } = useBusinessLabels()
const route = useRoute()
const toast = useToast()
const showForm = ref(false)
const closeForm = () => { showForm.value = false }
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(showForm, closeForm)
const editing = ref<Invoice | null>(null)
const showBillingProfile = ref(false)
const savingBillingProfile = ref(false)
const savingInvoice = ref(false)
const runningAction = ref<string | null>(null)
const showPdfPreview = ref(false)
const pdfPreviewUrl = ref<string | null>(null)
const pdfPreviewTitle = ref('')
const pdfPreviewHasQr = ref(false)
const loadingPdf = ref(false)
const downloadingPdf = ref(false)
const showPaymentForm = ref(false)
const savingPayment = ref(false)
const closePaymentForm = () => { showPaymentForm.value = false }
const { dialogRef: paymentDialogRef, handleDialogKeydown: handlePaymentDialogKeydown } = useAccessibleDialog(showPaymentForm, closePaymentForm)
const closePdfPreview = () => { showPdfPreview.value = false }
const { dialogRef: pdfDialogRef, handleDialogKeydown: handlePdfDialogKeydown } = useAccessibleDialog(showPdfPreview, closePdfPreview)
const billingProfile = reactive({
  billingName: '', billingStreet: '', billingBuilding: '', billingPostalCode: '', billingCity: '', billingCountry: 'CH',
  billingEmail: '', billingPhone: '', billingIban: '', billingUid: '', billingTerms: 'Paiement selon l’échéance indiquée.',
})
const billingProfileComplete = computed(() => Boolean(
  billingProfile.billingName && billingProfile.billingStreet && billingProfile.billingPostalCode
  && billingProfile.billingCity && billingProfile.billingCountry && isValidSwissIban(billingProfile.billingIban),
))
const billingIbanError = computed(() => {
  if (!billingProfile.billingIban.trim()) return null
  return isValidSwissIban(billingProfile.billingIban)
    ? null
    : 'Saisis un IBAN suisse ou liechtensteinois valide (CH ou LI).'
})
const billingIbanKind = computed(() => {
  if (!isValidSwissIban(billingProfile.billingIban)) return null
  return isQrIban(billingProfile.billingIban) ? 'QR-IBAN' : 'IBAN standard'
})
const pdfPreviewDisplayUrl = computed(() => {
  if (!pdfPreviewUrl.value) return null
  return pdfPreviewHasQr.value ? `${pdfPreviewUrl.value}#page=2&zoom=page-width` : pdfPreviewUrl.value
})

function formatBillingIban() {
  const iban = normalizeIban(billingProfile.billingIban)
  billingProfile.billingIban = iban.replace(/(.{4})/g, '$1 ').trim()
}

async function loadBillingProfile() {
  try {
    const row = await $fetch<Record<string, string | null>>('/api/admin/billing-profile', { headers: auth.authHeader() })
    Object.assign(billingProfile, {
      billingName: row.billing_name || '', billingStreet: row.billing_street || '', billingBuilding: row.billing_building || '',
      billingPostalCode: row.billing_postal_code || '', billingCity: row.billing_city || '', billingCountry: row.billing_country || 'CH',
      billingEmail: row.billing_email || '', billingPhone: row.billing_phone || '', billingIban: row.billing_iban || '',
      billingUid: row.billing_uid || '', billingTerms: row.billing_terms || '',
    })
  }
  catch {
    toast.error('Le profil de facturation nécessite la migration Supabase 20260804.')
  }
}

async function saveBillingProfile() {
  if (billingIbanError.value) {
    toast.error(billingIbanError.value)
    return
  }
  savingBillingProfile.value = true
  try {
    await $fetch('/api/admin/billing-profile', { method: 'PUT', body: billingProfile, headers: auth.authHeader() })
    toast.success('Profil de facturation enregistré')
    showBillingProfile.value = false
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Impossible d’enregistrer le profil de facturation')
  }
  finally {
    savingBillingProfile.value = false
  }
}
const form = reactive({ number: '', clientId: null as number | null, quoteId: null as number | null, amountCents: 0, currency: 'CHF', status: 'draft' as Invoice['status'], issuedAt: '', dueAt: '', paidAt: '', notes: '', documentType: 'invoice' as Invoice['documentType'], creditedInvoiceId: null as number | null, paymentReferenceType: 'NON' as Invoice['paymentReferenceType'], paymentReference: '' })
const paymentForm = reactive({ invoiceId: 0, amountCents: 0, method: 'bank_transfer' as NonNullable<Invoice['payments']>[number]['method'], paidAt: new Date().toISOString().slice(0, 10), reference: '', notes: '' })
const canUseQrr = computed(() => isQrIban(billingProfile.billingIban))
const canUseScor = computed(() => isValidSwissIban(billingProfile.billingIban) && !canUseQrr.value)
const qrReferenceError = computed(() => getQrReferenceError(
  billingProfile.billingIban,
  form.paymentReferenceType,
  form.paymentReference,
))
const formItems = ref<Array<{ label: string, description: string | null, quantity: number, unitPriceCents: number, taxRate: number }>>([{ label: 'Prestation', description: null, quantity: 1, unitPriceCents: 0, taxRate: 8.1 }])
const clientsById = computed(() => new Map(clients.clients.map(c => [c.id, c])))
const quotesById = computed(() => new Map(quotes.quotes.map(q => [q.id, q])))
const filteredQuotes = computed(() => {
  if (!form.clientId) return quotes.quotes
  return quotes.quotes.filter(q => q.clientId === form.clientId)
})
const selectedId = ref<number | null>(null)
const viewMode = ref<'table' | 'kanban'>('table')
const search = ref('')
const statusFilter = ref<'all' | Invoice['status']>('all')
const selectedInvoice = computed(() => store.invoices.find(i => i.id === selectedId.value) ?? null)
const invoiceStatuses: Array<Invoice['status']> = ['draft', 'sent', 'overdue', 'paid', 'cancelled']
const kanbanInvoices = computed(() =>
  invoiceStatuses.map(status => ({
    status,
    items: filteredInvoices.value.filter(i => i.status === status),
  })),
)
const filteredInvoices = computed(() => {
  const q = search.value.trim().toLowerCase()
  return store.invoices.filter((x) => {
    const byStatus = statusFilter.value === 'all' || x.status === statusFilter.value || (statusFilter.value === 'sent' && x.status === 'overdue')
    if (!byStatus) return false
    if (!q) return true
    return [x.number, x.notes || '', clientsById.value.get(x.clientId || 0)?.name || ''].join(' ').toLowerCase().includes(q)
  })
})
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
watch(() => form.paymentReferenceType, (referenceType) => {
  if (referenceType === 'NON') {
    form.paymentReference = ''
    return
  }
  if (referenceType === 'SCOR' && !form.paymentReference.trim()) generateInvoiceScorReference()
})
function generateInvoiceScorReference() {
  form.paymentReferenceType = 'SCOR'
  form.paymentReference = generateScorReference(form.number || Date.now())
}
async function nextNumber(kind: 'invoice' | 'credit_note' = 'invoice') { try { return (await $fetch<{ number: string }>('/api/admin/billing/next-number', { query: { kind }, headers: auth.authHeader() })).number } catch { return '' } }
async function openNew() { editing.value = null; Object.assign(form, { number: await nextNumber(), clientId: null, quoteId: null, amountCents: 0, currency: 'CHF', status: 'draft', issuedAt: new Date().toISOString().slice(0, 10), dueAt: '', paidAt: '', notes: '', documentType: 'invoice', creditedInvoiceId: null, paymentReferenceType: 'NON', paymentReference: '' }); formItems.value = [{ label: 'Prestation', description: null, quantity: 1, unitPriceCents: 0, taxRate: 8.1 }]; showForm.value = true }
function openEdit(x: Invoice) { if (x.lockedAt || x.status !== 'draft') { toast.error('Ce document est verrouillé. Duplique-le ou crée un avoir pour le corriger.'); return }; editing.value = x; Object.assign(form, x); formItems.value = (x.items?.length ? x.items.map(i => ({ label: i.label, description: i.description, quantity: i.quantity, unitPriceCents: i.unitPriceCents, taxRate: i.taxRate })) : [{ label: 'Prestation', description: null, quantity: 1, unitPriceCents: 0, taxRate: 8.1 }]); showForm.value = true }
async function duplicateInvoice(i: Invoice) { editing.value = null; Object.assign(form, { ...i, number: await nextNumber(), quoteId: null, status: 'draft', issuedAt: new Date().toISOString().slice(0, 10), dueAt: '', paidAt: '', documentType: 'invoice', creditedInvoiceId: null, paymentReferenceType: 'NON', paymentReference: '' }); formItems.value = (i.items?.length ? i.items.map(item => ({ label: item.label, description: item.description, quantity: item.quantity, unitPriceCents: item.unitPriceCents, taxRate: item.taxRate })) : [{ label: 'Prestation', description: null, quantity: 1, unitPriceCents: 0, taxRate: 8.1 }]); showForm.value = true }
async function createCreditNote(i: Invoice) { editing.value = null; Object.assign(form, { ...i, number: await nextNumber('credit_note'), quoteId: null, status: 'draft', issuedAt: new Date().toISOString().slice(0, 10), dueAt: '', paidAt: '', notes: `Avoir relatif à la facture ${i.number}`, documentType: 'credit_note', creditedInvoiceId: i.id, paymentReferenceType: 'NON', paymentReference: '' }); formItems.value = (i.items?.length ? i.items.map(item => ({ label: item.label, description: item.description, quantity: item.quantity, unitPriceCents: item.unitPriceCents, taxRate: item.taxRate })) : [{ label: 'Correction', description: null, quantity: 1, unitPriceCents: i.totalCents ?? i.amountCents, taxRate: 0 }]); showForm.value = true }
async function sendInvoiceEmail(i: Invoice) { runningAction.value = `send-${i.id}`; try { await $fetch('/api/invoices/send', { method: 'POST', body: { id: i.id }, headers: auth.authHeader() }); await store.ensureLoaded(true); const label = i.documentType === 'credit_note' ? 'Avoir' : 'Facture'; toast.success(`${label} ${i.number} envoyé${label === 'Facture' ? 'e' : ''} avec son PDF`) } catch (error: any) { toast.error(error?.data?.message || 'Impossible d’envoyer le document') } finally { runningAction.value = null } }
function computeFormTotals(items: Array<{ quantity: number, unitPriceCents: number, taxRate: number }>) { const subtotalCents = items.reduce((acc, item) => acc + Math.round((Number(item.quantity) || 0) * (Number(item.unitPriceCents) || 0)), 0); const totalCents = items.reduce((acc, item) => { const line = Math.round((Number(item.quantity) || 0) * (Number(item.unitPriceCents) || 0)); return acc + Math.round(line * (1 + (Number(item.taxRate) || 0) / 100)) }, 0); return { subtotalCents, taxCents: Math.max(0, totalCents - subtotalCents), totalCents } }
const draftTotals = computed(() => computeFormTotals(formItems.value))
function addItem() { formItems.value.push({ label: '', description: null, quantity: 1, unitPriceCents: 0, taxRate: 8.1 }) }
function removeItem(idx: number) { formItems.value.splice(idx, 1) }
async function submit() {
  if (qrReferenceError.value) {
    toast.error(qrReferenceError.value)
    return
  }
  savingInvoice.value = true
  try {
    const totals = computeFormTotals(formItems.value)
    const payload = { ...form, amountCents: totals.totalCents, items: formItems.value, issuedAt: form.issuedAt || null, dueAt: form.dueAt || null, paidAt: form.paidAt || null, notes: form.notes || null }
    const savedInvoice = editing.value
      ? await store.update(editing.value.id, payload as any)
      : await store.add(payload as any)
    selectedId.value = savedInvoice.id
    showForm.value = false
    toast.success('Facture enregistrée')
    await previewPdf(savedInvoice)
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Impossible d’enregistrer la facture')
  }
  finally {
    savingInvoice.value = false
  }
}
async function del(id: number) { if (!confirm('Supprimer ?')) return; try { await store.remove(id); if (selectedId.value === id) selectedId.value = store.invoices[0]?.id ?? null; toast.success('Supprime') } catch { toast.error('Erreur') } }
async function quickSetStatus(id: number, status: Invoice['status']) {
  try {
    const invoice = store.invoices.find(i => i.id === id)
    if (status === 'paid' && invoice) {
      openPaymentForm(invoice)
      return
    }
    const patch: Record<string, any> = { status }
    if (status === 'paid' && !store.invoices.find(i => i.id === id)?.paidAt) patch.paidAt = new Date().toISOString().slice(0, 10)
    await store.update(id, patch as any)
    toast.success(`Statut: ${status}`)
  } catch {
    toast.error('Erreur statut')
  }
}
function openPaymentForm(invoice: Invoice) {
  const remaining = Math.max(0, (invoice.totalCents ?? invoice.amountCents) - invoice.paidAmountCents)
  if (!remaining) { toast.error('Ce document est déjà entièrement réglé.'); return }
  Object.assign(paymentForm, { invoiceId: invoice.id, amountCents: remaining, method: 'bank_transfer', paidAt: new Date().toISOString().slice(0, 10), reference: '', notes: '' })
  showPaymentForm.value = true
}
async function recordPayment() {
  savingPayment.value = true
  try {
    await $fetch('/api/invoices/payments', { method: 'POST', body: paymentForm, headers: auth.authHeader() })
    await store.ensureLoaded(true)
    showPaymentForm.value = false
    toast.success('Paiement enregistré dans l’historique')
  } catch (error: any) { toast.error(error?.data?.message || 'Impossible d’enregistrer le paiement') } finally { savingPayment.value = false }
}
async function voidPayment(id: number) {
  const reason = prompt('Motif de l’annulation de ce paiement :')?.trim()
  if (!reason) return
  try {
    await $fetch('/api/invoices/payments', { method: 'DELETE', body: { id, reason }, headers: auth.authHeader() })
    await store.ensureLoaded(true)
    toast.success('Paiement annulé et conservé dans l’historique')
  } catch (error: any) { toast.error(error?.data?.message || 'Impossible d’annuler le paiement') }
}
function upsertNoteLine(source: string | null | undefined, key: string, value: string) {
  const lines = (source || '').split('\n').filter(Boolean)
  const prefix = `[${key}] `
  const next = lines.filter(line => !line.startsWith(prefix))
  next.push(`${prefix}${value}`)
  return next.join('\n').trim()
}
async function markInvoiceEvent(i: Invoice, event: 'sent_at' | 'viewed_at' | 'paid_signal_at') {
  try {
    const now = new Date().toISOString()
    const notes = upsertNoteLine(i.notes, event, now)
    const patch: Partial<Invoice> = { notes }
    if (event === 'sent_at') patch.status = 'sent'
    if (event === 'paid_signal_at') { openPaymentForm(i); return }
    await store.update(i.id, patch as any)
    toast.success('Evenement enregistre')
  } catch {
    toast.error('Erreur evenement')
  }
}
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
  const documentLabel = i.documentType === 'credit_note' ? 'Avoir' : 'Facture'
  const client = i.clientId ? (clientsById.value.get(i.clientId)?.name || '-') : '-'
  const quote = i.quoteId ? (quotesById.value.get(i.quoteId)?.number || '-') : '-'
  const html = `
    <html><head><title>${documentLabel} ${i.number}</title></head>
    <body style="font-family: Inter, system-ui, sans-serif; padding: 24px; color: #111827;">
      <h1 style="margin:0 0 16px;">${documentLabel} ${i.number}</h1>
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
async function fetchInvoicePdf(invoice: Invoice) {
  return await $fetch<Blob>('/api/invoices/pdf', {
    query: { id: invoice.id },
    headers: auth.authHeader(),
    responseType: 'blob',
  })
}
function releasePdfPreview() {
  if (pdfPreviewUrl.value) URL.revokeObjectURL(pdfPreviewUrl.value)
  pdfPreviewUrl.value = null
}
async function previewPdf(invoice = selectedInvoice.value) {
  if (!invoice) { toast.error('Sélectionne une facture à prévisualiser.'); return }
  loadingPdf.value = true
  try {
    const blob = await fetchInvoicePdf(invoice)
    releasePdfPreview()
    pdfPreviewUrl.value = URL.createObjectURL(blob)
    pdfPreviewTitle.value = `${invoice.documentType === 'credit_note' ? 'Avoir' : 'Facture'} ${invoice.number}`
    pdfPreviewHasQr.value = invoice.documentType !== 'credit_note' && isValidSwissIban(billingProfile.billingIban)
    showPdfPreview.value = true
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Impossible de générer l’aperçu PDF.')
  }
  finally {
    loadingPdf.value = false
  }
}
async function downloadPdf(invoice = selectedInvoice.value) {
  if (!invoice) { toast.error('Sélectionne une facture à télécharger.'); return }
  downloadingPdf.value = true
  try {
    const blob = await fetchInvoicePdf(invoice)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${invoice.documentType === 'credit_note' ? 'avoir' : 'facture'}-${invoice.number}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Impossible de télécharger le PDF.')
  }
  finally {
    downloadingPdf.value = false
  }
}
onMounted(async () => {
  await Promise.all([store.ensureLoaded(), clients.ensureLoaded(), quotes.ensureLoaded(), loadBillingProfile()])
  if (route.query.new === '1') {
    await openNew()
    const id = Number(route.query.clientId || 0)
    if (id) form.clientId = id
  }
  const qStatus = String(route.query.status || '')
  if (qStatus === 'draft' || qStatus === 'sent' || qStatus === 'paid' || qStatus === 'overdue' || qStatus === 'cancelled') statusFilter.value = qStatus
  const qSearch = String(route.query.search || '')
  if (qSearch) search.value = qSearch
  selectedId.value = store.invoices.at(0)?.id ?? null
})
onBeforeUnmount(releasePdfPreview)
</script>
<template>
  <div class="space-y-5">
    <section class="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Facturation</span>
          <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Factures</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Emets, encaisse et relance tes factures clients.</p>
        </div>
        <div class="admin-page-actions flex flex-wrap items-center gap-2">
          <button class="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]" @click="exportCsv">Exporter CSV</button>
          <button class="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]" @click="printSelected">Imprimer</button>
          <button class="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]" :disabled="!selectedInvoice || loadingPdf" @click="previewPdf()">{{ loadingPdf ? 'Génération…' : 'Aperçu PDF' }}</button>
          <button class="inline-flex h-10 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition" :class="billingProfileComplete ? 'border-emerald-300 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300' : 'border-amber-300 text-amber-700 dark:border-amber-500/30 dark:text-amber-300'" @click="showBillingProfile = !showBillingProfile">Coordonnées &amp; IBAN</button>
          <button class="inline-flex h-10 items-center justify-center rounded-lg bg-gradient-brand px-4 text-xs font-semibold text-white shadow-glow-sm transition hover:opacity-90" @click="openNew">Nouvelle</button>
        </div>
      </div>
    </section>
    <form v-if="showBillingProfile" class="rounded-xl border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-500/20 dark:bg-[#111118]" @submit.prevent="saveBillingProfile">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div><h2 class="font-semibold text-gray-950 dark:text-white">Coordonnées de facturation</h2><p class="mt-1 text-sm text-gray-500">Enregistre d’abord ton IBAN, puis complète les autres informations à ton rythme. Ces données alimentent les PDF Typst et les QR-factures suisses.</p></div>
        <span class="rounded-lg px-2 py-1 text-xs" :class="billingProfileComplete ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'">{{ billingProfileComplete ? 'Complet' : 'À compléter' }}</span>
      </div>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label class="space-y-1 text-xs text-gray-500">Nom légal<input v-model="billingProfile.billingName" class="input-field" autocomplete="organization"></label>
        <label class="space-y-1 text-xs text-gray-500">E-mail<input v-model="billingProfile.billingEmail" type="email" class="input-field" autocomplete="email"></label>
        <label class="space-y-1 text-xs text-gray-500">Rue<input v-model="billingProfile.billingStreet" class="input-field" autocomplete="street-address"></label>
        <label class="space-y-1 text-xs text-gray-500">N°<input v-model="billingProfile.billingBuilding" class="input-field"></label>
        <label class="space-y-1 text-xs text-gray-500">NPA<input v-model="billingProfile.billingPostalCode" class="input-field" autocomplete="postal-code"></label>
        <label class="space-y-1 text-xs text-gray-500">Localité<input v-model="billingProfile.billingCity" class="input-field" autocomplete="address-level2"></label>
        <label class="space-y-1 text-xs text-gray-500">Pays (ISO)<input v-model="billingProfile.billingCountry" maxlength="2" class="input-field" required autocomplete="country"></label>
        <label class="space-y-1 text-xs text-gray-500">Téléphone<input v-model="billingProfile.billingPhone" class="input-field" autocomplete="tel"></label>
        <label class="space-y-1 text-xs text-gray-500 md:col-span-2">IBAN ou QR-IBAN
          <input v-model="billingProfile.billingIban" class="input-field font-mono uppercase tracking-wide" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CH93 0076 2011 6238 5295 7" :aria-invalid="Boolean(billingIbanError)" aria-describedby="billing-iban-help" @blur="formatBillingIban">
          <span id="billing-iban-help" class="block text-xs" :class="billingIbanError ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'">
            {{ billingIbanError || (billingIbanKind ? `${billingIbanKind} reconnu. Tu peux enregistrer le profil.` : 'Les espaces sont acceptés. Un IBAN standard permet SCOR ; un QR-IBAN permet QRR.') }}
          </span>
        </label>
        <label class="space-y-1 text-xs text-gray-500">IDE / TVA<input v-model="billingProfile.billingUid" class="input-field"></label>
        <label class="space-y-1 text-xs text-gray-500">Conditions<input v-model="billingProfile.billingTerms" class="input-field"></label>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3"><p class="text-xs text-gray-500 dark:text-gray-400">Le statut « Complet » s’active lorsque l’identité, l’adresse et l’IBAN sont renseignés.</p><div class="flex gap-2"><button type="button" class="min-h-11 px-4 text-sm" @click="showBillingProfile = false">Annuler</button><button class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" :disabled="savingBillingProfile || Boolean(billingIbanError)">{{ savingBillingProfile ? 'Enregistrement…' : 'Enregistrer' }}</button></div></div>
    </form>
    <div v-if="!isValidSwissIban(billingProfile.billingIban) && !showBillingProfile" class="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between" role="status">
      <div><p class="text-sm font-semibold">IBAN non configuré</p><p class="mt-1 text-xs text-amber-800 dark:text-amber-200/80">Ajoute ton IBAN pour générer une QR-facture suisse. Tu peux déjà créer et prévisualiser un PDF classique sans IBAN.</p></div>
      <button type="button" class="min-h-10 shrink-0 rounded-lg bg-amber-900 px-4 text-xs font-semibold text-white transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200" @click="showBillingProfile = true">Ajouter mon IBAN</button>
    </div>
    <div class="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111118] p-3 grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-2">
      <input v-model="search" class="input-field" placeholder="Rechercher facture...">
      <select v-model="statusFilter" class="input-field">
        <option value="all">Tous statuts</option>
        <option value="draft">{{ statusLabel('draft') }}</option>
        <option value="sent">{{ statusLabel('sent') }} / {{ statusLabel('overdue') }}</option>
        <option value="paid">{{ statusLabel('paid') }}</option>
        <option value="cancelled">{{ statusLabel('cancelled') }}</option>
      </select>
      <div class="sm:col-span-2 flex items-center gap-2 pt-1">
        <button class="px-3 py-1.5 text-xs rounded-lg border" :class="viewMode==='table' ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 dark:border-white/[0.12]'" @click="viewMode='table'">Table</button>
        <button class="px-3 py-1.5 text-xs rounded-lg border" :class="viewMode==='kanban' ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 dark:border-white/[0.12]'" @click="viewMode='kanban'">Kanban</button>
      </div>
    </div>
    <div class="grid lg:grid-cols-[1fr_320px] gap-4">
    <div class="space-y-3">
      <div v-if="viewMode==='kanban'" class="grid grid-cols-1 xl:grid-cols-5 gap-3">
        <div v-for="col in kanbanInvoices" :key="`i-col-${col.status}`" class="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111118] p-3 space-y-2">
          <p class="text-xs uppercase text-gray-400">{{ statusLabel(col.status) }} ({{ col.items.length }})</p>
          <button
            v-for="i in col.items"
            :key="`kanban-${i.id}`"
            class="w-full rounded-lg border border-gray-100 dark:border-white/[0.08] p-2.5 text-left"
            @click="selectedId = i.id"
          >
            <p class="text-sm font-semibold">{{ i.documentType === 'credit_note' ? 'Avoir' : 'Facture' }} {{ i.number }}</p>
            <p class="text-xs text-gray-500 line-clamp-1">{{ i.clientId ? clientsById.get(i.clientId)?.name || '-' : '-' }}</p>
            <p class="text-xs mt-1">{{ formatAmount(i.amountCents, i.currency) }}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button v-if="i.status!=='sent'" class="text-xs text-amber-600" @click.stop="quickSetStatus(i.id,'sent')">Envoyer</button>
              <button v-if="i.status!=='paid'" class="text-xs text-emerald-600" @click.stop="quickSetStatus(i.id,'paid')">Payer</button>
              <button v-if="i.status === 'draft'" class="text-xs text-violet-600" @click.stop="openEdit(i)">Éditer</button>
            </div>
          </button>
        </div>
      </div>

      <div class="sm:hidden space-y-2">
        <button
          v-for="q in filteredInvoices"
          :key="`mobile-${q.id}`"
          class="w-full rounded-xl border p-3 text-left bg-white dark:bg-[#111118] border-gray-100 dark:border-white/[0.06]"
          :class="selectedId === q.id ? 'ring-1 ring-violet-500/60' : ''"
          @click="selectedId = q.id"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-semibold">{{ q.documentType === 'credit_note' ? 'Avoir' : 'Facture' }} {{ q.number }}</p>
            <span class="text-xs uppercase text-gray-400">{{ statusLabel(q.status) }}</span>
          </div>
          <p class="mt-1 text-xs text-gray-500">{{ q.clientId ? clientsById.get(q.clientId)?.name || '-' : '-' }}</p>
          <p class="mt-1 text-xs text-gray-500">Echeance: {{ q.dueAt || '-' }}</p>
          <p class="mt-2 text-sm font-medium">{{ formatAmount(q.amountCents, q.currency) }}</p>
          <div class="mt-3 flex items-center gap-3">
            <button class="text-xs text-emerald-600" @click.stop="quickSetStatus(q.id, 'paid')">Paye</button>
            <button v-if="q.status === 'draft'" class="text-xs text-violet-600" @click.stop="openEdit(q)">Éditer</button>
            <button v-if="q.status === 'draft'" class="text-xs text-red-500" @click.stop="del(q.id)">Supprimer</button>
          </div>
        </button>
      </div>

    <div v-if="viewMode==='table'" class="admin-table-wrap hidden sm:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="admin-table w-full">
        <thead><tr class="border-b border-gray-100 dark:border-white/[0.06]"><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Numero</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Client</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Devis</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Montant</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Echeance</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Statut</th><th class="text-right px-4 py-3 text-xs uppercase text-gray-400">Actions</th></tr></thead>
        <tbody><tr v-for="q in filteredInvoices" :key="q.id" class="border-b border-gray-50 dark:border-white/[0.03] cursor-pointer" :class="selectedId === q.id ? 'bg-violet-50/60 dark:bg-violet-500/10' : ''" @click="selectedId = q.id"><td class="px-4 py-3 text-sm"><span v-if="q.documentType === 'credit_note'" class="mr-1 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-cyan-700 dark:text-cyan-300">Avoir</span>{{ q.number }}</td><td class="px-4 py-3 text-sm">{{ q.clientId ? clientsById.get(q.clientId)?.name || '-' : '-' }}</td><td class="px-4 py-3 text-sm">{{ q.quoteId ? quotesById.get(q.quoteId)?.number || '-' : '-' }}</td><td class="px-4 py-3 text-sm">{{ formatAmount(q.amountCents, q.currency) }}</td><td class="px-4 py-3 text-sm">{{ q.dueAt || '-' }}</td><td class="px-4 py-3 text-sm">{{ statusLabel(q.status) }}</td><td class="px-4 py-3 text-right space-x-2"><button v-if="q.status !== 'paid' && q.status !== 'cancelled'" class="text-xs text-emerald-600" @click.stop="quickSetStatus(q.id, 'paid')">Paiement</button><button v-if="q.status === 'draft'" class="text-xs text-amber-600" @click.stop="quickSetStatus(q.id, 'sent')">Envoyée</button><button v-if="q.status === 'draft'" class="text-xs text-violet-600" @click.stop="openEdit(q)">Éditer</button><button v-if="q.status === 'draft'" class="text-xs text-red-500" @click.stop="del(q.id)">Supprimer</button></td></tr></tbody>
      </table>
    </div>
    </div>
    <div class="hidden lg:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-4 lg:sticky lg:top-20">
      <template v-if="selectedInvoice">
        <p class="text-xs uppercase text-gray-400">{{ selectedInvoice.documentType === 'credit_note' ? 'Avoir' : 'Facture' }} · {{ selectedInvoice.lockedAt ? 'Verrouillé' : 'Brouillon modifiable' }}</p>
        <h2 class="text-lg font-semibold mt-1">{{ selectedInvoice.number }}</h2>
        <div class="mt-4 space-y-2 text-sm">
          <p><span class="text-gray-400">Client:</span> {{ selectedInvoice.clientId ? clientsById.get(selectedInvoice.clientId)?.name || '-' : '-' }}</p>
          <p><span class="text-gray-400">Devis:</span> {{ selectedInvoice.quoteId ? quotesById.get(selectedInvoice.quoteId)?.number || '-' : '-' }}</p>
          <p><span class="text-gray-400">Montant:</span> {{ formatAmount(selectedInvoice.totalCents ?? selectedInvoice.amountCents, selectedInvoice.currency) }}</p>
          <p><span class="text-gray-400">Sous-total:</span> {{ formatAmount(selectedInvoice.subtotalCents ?? selectedInvoice.amountCents, selectedInvoice.currency) }}</p>
          <p><span class="text-gray-400">TVA:</span> {{ formatAmount(selectedInvoice.taxCents ?? 0, selectedInvoice.currency) }}</p>
          <p><span class="text-gray-400">Statut:</span> {{ statusLabel(selectedInvoice.status) }}</p>
          <p><span class="text-gray-400">Emission:</span> {{ selectedInvoice.issuedAt || '-' }}</p>
          <p><span class="text-gray-400">Echeance:</span> {{ selectedInvoice.dueAt || '-' }}</p>
          <p><span class="text-gray-400">Paye le:</span> {{ selectedInvoice.paidAt || '-' }}</p>
          <p><span class="text-gray-400">Encaissé:</span> {{ formatAmount(selectedInvoice.paidAmountCents, selectedInvoice.currency) }}</p>
          <p><span class="text-gray-400">Solde:</span> {{ formatAmount(Math.max(0, (selectedInvoice.totalCents ?? selectedInvoice.amountCents) - selectedInvoice.paidAmountCents), selectedInvoice.currency) }}</p>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <button class="min-h-10 rounded-lg border border-violet-200 px-3 text-xs font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-500/30 dark:text-violet-300" :disabled="loadingPdf" @click="previewPdf(selectedInvoice)">{{ loadingPdf ? 'Génération…' : 'Voir le PDF' }}</button>
          <button class="min-h-10 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:text-gray-200" :disabled="downloadingPdf" @click="downloadPdf(selectedInvoice)">{{ downloadingPdf ? 'Téléchargement…' : 'Télécharger' }}</button>
          <button class="col-span-2 min-h-10 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white disabled:opacity-50" :disabled="runningAction === `send-${selectedInvoice.id}`" @click="sendInvoiceEmail(selectedInvoice)">{{ runningAction === `send-${selectedInvoice.id}` ? 'Envoi…' : 'Envoyer avec le PDF' }}</button>
          <button class="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.12] text-xs" @click="markInvoiceEvent(selectedInvoice, 'sent_at')">Marquer envoyee</button>
          <button class="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.12] text-xs" @click="markInvoiceEvent(selectedInvoice, 'viewed_at')">Marquer vue</button>
          <button v-if="selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled'" class="px-2 py-1.5 rounded-lg border border-emerald-300/60 text-emerald-600 text-xs col-span-2" @click="openPaymentForm(selectedInvoice)">Enregistrer un paiement</button>
          <button class="col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.12] text-xs" @click="duplicateInvoice(selectedInvoice)">Dupliquer la facture</button>
          <button v-if="selectedInvoice.documentType === 'invoice' && selectedInvoice.status !== 'draft'" class="col-span-2 px-2 py-1.5 rounded-lg border border-cyan-300/60 text-cyan-700 dark:text-cyan-300 text-xs" @click="createCreditNote(selectedInvoice)">Créer un avoir</button>
        </div>
        <div v-if="selectedInvoice.payments?.length" class="mt-4 border-t border-gray-100 pt-3 dark:border-white/[0.06]">
          <p class="text-xs font-semibold uppercase text-gray-400">Historique des paiements</p>
          <div v-for="payment in selectedInvoice.payments" :key="payment.id" class="mt-2 rounded-lg border border-gray-100 p-2 text-xs dark:border-white/[0.06]" :class="payment.voidedAt ? 'opacity-50' : ''">
            <div class="flex items-center justify-between gap-2"><span>{{ payment.paidAt }} · {{ payment.method }}</span><strong>{{ formatAmount(payment.amountCents, payment.currency) }}</strong></div>
            <p v-if="payment.reference" class="mt-1 text-gray-500">Réf. {{ payment.reference }}</p>
            <p v-if="payment.voidedAt" class="mt-1 text-red-500">Annulé : {{ payment.voidReason }}</p>
            <button v-else class="mt-1 text-red-500" @click="voidPayment(payment.id)">Annuler cette écriture</button>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-4 whitespace-pre-wrap">{{ selectedInvoice.notes || 'Aucune note' }}</p>
      </template>
      <p v-else class="text-sm text-gray-400">Selectionne une facture.</p>
    </div>
    </div>
    <Transition name="fade">
      <div v-if="showForm" ref="dialogRef" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="invoice-form-title" tabindex="-1" @keydown="handleDialogKeydown">
        <div class="absolute inset-0 bg-black/40" @click="showForm=false" />
        <form class="admin-modal-panel relative w-full max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden bg-white dark:bg-[#111118] rounded-xl p-4 sm:p-5 space-y-3" @submit.prevent="submit">
          <h2 id="invoice-form-title" class="font-semibold text-gray-900 dark:text-white">{{ form.documentType === 'credit_note' ? 'Nouvel avoir' : editing ? 'Modifier la facture' : 'Nouvelle facture' }}</h2>
          <p v-if="form.documentType === 'credit_note'" class="rounded-lg bg-cyan-50 p-3 text-sm text-cyan-900 dark:bg-cyan-500/10 dark:text-cyan-100">Cet avoir corrigera la facture {{ store.invoices.find(i => i.id === form.creditedInvoiceId)?.number }}. Il ne contiendra pas de QR de paiement.</p>
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
          <label class="block space-y-1 text-xs text-gray-500">Devise
            <select v-model="form.currency" class="input-field"><option value="CHF">CHF</option><option value="EUR">EUR</option></select>
          </label>
          <div class="space-y-2 border border-gray-200 dark:border-white/[0.08] rounded-lg p-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase text-gray-400">Lignes</p>
              <button type="button" class="text-xs text-violet-600" @click="addItem">Ajouter</button>
            </div>
            <div v-for="(item, idx) in formItems" :key="idx" class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center min-w-0">
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
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input v-model="form.issuedAt" type="date" class="input-field">
            <input v-model="form.dueAt" type="date" class="input-field">
            <input v-model="form.paidAt" type="date" class="input-field">
          </div>
          <select v-model="form.status" class="input-field">
            <option value="draft">{{ statusLabel('draft') }}</option>
            <option value="sent">{{ statusLabel('sent') }}</option>
            <option value="paid">{{ statusLabel('paid') }}</option>
            <option value="overdue">{{ statusLabel('overdue') }}</option>
            <option value="cancelled">{{ statusLabel('cancelled') }}</option>
          </select>
          <textarea v-model="form.notes" rows="3" class="input-field" placeholder="Notes" />
          <fieldset v-if="form.documentType !== 'credit_note'" class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-white/[0.08]">
            <legend class="px-1 text-xs font-semibold uppercase text-gray-500">QR-facture suisse</legend>
            <div v-if="canUseScor" class="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:bg-violet-500/10 dark:text-violet-100">
              Ton IBAN standard est prêt. Choisis <strong>QR simple</strong> sans référence, ou <strong>SCOR</strong> pour créer automatiquement une référence RF. L’option QRR nécessite un QR-IBAN distinct fourni par ta banque.
            </div>
            <div v-else-if="canUseQrr" class="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:bg-violet-500/10 dark:text-violet-100">
              Ton QR-IBAN est prêt. Choisis QRR et renseigne la référence QR à 27 chiffres liée à cette facture.
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
              <label class="space-y-1 text-xs text-gray-500">Type de référence
                <select v-model="form.paymentReferenceType" class="input-field">
                  <option value="NON">QR simple — sans référence</option>
                  <option value="SCOR" :disabled="!canUseScor">QR avec référence RF (SCOR){{ canUseScor ? '' : ' — IBAN standard requis' }}</option>
                  <option value="QRR" :disabled="!canUseQrr">QR avec référence à 27 chiffres (QRR){{ canUseQrr ? '' : ' — QR-IBAN bancaire requis' }}</option>
                </select>
              </label>
              <label v-if="form.paymentReferenceType !== 'NON'" class="space-y-1 text-xs text-gray-500">Référence
                <input v-model="form.paymentReference" class="input-field" :aria-invalid="Boolean(qrReferenceError)" aria-describedby="invoice-reference-help" :placeholder="form.paymentReferenceType === 'QRR' ? '27 chiffres' : 'RF…'">
              </label>
            </div>
            <div v-if="form.paymentReferenceType === 'SCOR'" class="flex flex-wrap items-center gap-3">
              <button type="button" class="min-h-10 rounded-lg border border-violet-200 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-500/30 dark:text-violet-300 dark:hover:bg-violet-500/10" @click="generateInvoiceScorReference">Générer une référence RF valide</button>
              <span class="text-xs text-gray-500 dark:text-gray-400">La référence est calculée à partir du numéro {{ form.number || 'de la facture' }}.</span>
            </div>
            <p v-if="qrReferenceError" id="invoice-reference-help" role="alert" class="text-xs font-medium text-red-600 dark:text-red-400">{{ qrReferenceError }}</p>
            <p v-else id="invoice-reference-help" class="text-xs text-gray-500">Le QR code sera intégré au PDF dès que tes coordonnées de facturation sont complètes. Si l’adresse du client manque, la zone « Payable par » restera à compléter sur le bulletin.</p>
          </fieldset>
          <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end gap-2">
            <button type="button" class="px-3 py-2 text-sm" @click="showForm=false">Annuler</button>
            <button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm disabled:cursor-not-allowed disabled:opacity-50" :disabled="Boolean(qrReferenceError) || savingInvoice">{{ savingInvoice ? 'Génération du PDF…' : 'Enregistrer et prévisualiser' }}</button>
          </div>
        </form>
      </div>
    </Transition>
    <Transition name="fade">
      <div v-if="showPaymentForm" ref="paymentDialogRef" class="fixed inset-0 z-[55] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="invoice-payment-title" tabindex="-1" @keydown="handlePaymentDialogKeydown">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closePaymentForm" />
        <form class="relative w-full max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/[0.1] dark:bg-[#111118]" @submit.prevent="recordPayment">
          <div>
            <h2 id="invoice-payment-title" class="font-semibold text-gray-950 dark:text-white">Enregistrer un paiement</h2>
            <p class="mt-1 text-sm text-gray-500">L’écriture restera dans l’historique. Une erreur sera annulée avec un motif, jamais supprimée.</p>
          </div>
          <label class="block space-y-1 text-xs text-gray-500">Montant en centimes
            <input v-model.number="paymentForm.amountCents" class="input-field" type="number" min="1" required>
          </label>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="block space-y-1 text-xs text-gray-500">Mode
              <select v-model="paymentForm.method" class="input-field">
                <option value="bank_transfer">Virement bancaire</option>
                <option value="swiss_qr">QR-facture suisse</option>
                <option value="twint">TWINT</option>
                <option value="cash">Espèces</option>
                <option value="other">Autre</option>
              </select>
            </label>
            <label class="block space-y-1 text-xs text-gray-500">Date
              <input v-model="paymentForm.paidAt" class="input-field" type="date" required>
            </label>
          </div>
          <label class="block space-y-1 text-xs text-gray-500">Référence
            <input v-model="paymentForm.reference" class="input-field" placeholder="Référence bancaire ou TWINT">
          </label>
          <label class="block space-y-1 text-xs text-gray-500">Note
            <textarea v-model="paymentForm.notes" class="input-field" rows="2" placeholder="Information interne facultative" />
          </label>
          <div class="flex justify-end gap-2">
            <button type="button" class="min-h-10 px-3 text-sm" @click="closePaymentForm">Annuler</button>
            <button class="min-h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50" :disabled="savingPayment">{{ savingPayment ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </div>
        </form>
      </div>
    </Transition>
    <Transition name="fade">
      <div v-if="showPdfPreview" ref="pdfDialogRef" class="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="invoice-pdf-preview-title" tabindex="-1" @keydown="handlePdfDialogKeydown">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="closePdfPreview" />
        <section class="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl dark:bg-[#111118]">
          <header class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-white/[0.08]">
            <div class="min-w-0"><h2 id="invoice-pdf-preview-title" class="truncate font-semibold text-gray-950 dark:text-white">{{ pdfPreviewTitle }}</h2><p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ pdfPreviewHasQr ? 'Bulletin QR affiché sur la page 2. La facture détaillée se trouve sur la page 1.' : 'Aperçu du document qui sera envoyé au client.' }}</p></div>
            <div class="flex items-center gap-2"><button type="button" class="min-h-10 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 disabled:opacity-50 dark:border-white/[0.12] dark:text-gray-200" :disabled="downloadingPdf" @click="downloadPdf()">Télécharger</button><button type="button" class="min-h-10 rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white" @click="closePdfPreview">Fermer</button></div>
          </header>
          <iframe v-if="pdfPreviewDisplayUrl" :src="pdfPreviewDisplayUrl" :title="`Aperçu PDF de ${pdfPreviewTitle}`" class="min-h-0 flex-1 bg-gray-100" />
          <div v-else class="flex flex-1 items-center justify-center text-sm text-gray-500">Génération de l’aperçu…</div>
        </section>
      </div>
    </Transition>
  </div>
</template>
