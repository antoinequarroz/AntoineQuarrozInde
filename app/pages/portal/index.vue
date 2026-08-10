<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'portal' })

type PortalPayment = { id: number, amount_cents: number, currency: string, method: string, paid_at: string, reference?: string | null }
type PortalInvoice = { id: number, number: string, total_cents: number, paid_amount_cents: number, currency: string, status: string, document_type?: string | null, issued_at?: string | null, due_at?: string | null, payments?: PortalPayment[] }
type PortalQuote = { id: number, number: string, title: string, total_cents: number, currency: string, status: string, issued_at?: string | null, valid_until?: string | null }
type PortalMilestone = { id: number, title: string, due_at?: string | null, status: string }
type PortalDeliverable = { id: number, title: string, url?: string | null, status: string }
type PortalNote = { id: number, kind: string, title: string, content?: string | null, occurred_at?: string | null }
type PortalProject = { id: number, title: string, category: string, description: string, live_url?: string | null, milestones?: PortalMilestone[], deliverables?: PortalDeliverable[], notes?: PortalNote[] }
type PortalData = {
  organization: { name: string }
  client: { id: number, name: string, company?: string | null }
  projects: PortalProject[]
  quotes: PortalQuote[]
  invoices: PortalInvoice[]
  payments: { twintAvailable: boolean }
}

const auth = useAuthStore()
const route = useRoute()
const data = ref<PortalData | null>(null)
const loading = ref(true)
const loadError = ref(false)
const payingId = ref<number | null>(null)
const paymentErrorMessage = ref('')
const decidingQuoteId = ref<number | null>(null)
const proposedDecision = ref<'accepted' | 'rejected' | null>(null)
const decisionLoading = ref(false)
const decisionErrorMessage = ref('')
const decisionAnnouncement = ref('')
const decisionReturnFocusId = ref('')
const downloadingKey = ref('')
const documentFeedback = ref<{ key: string, type: 'success' | 'error', message: string } | null>(null)

const money = (cents: number, currency = 'CHF') => new Intl.NumberFormat('fr-CH', { style: 'currency', currency }).format((Number(cents) || 0) / 100)
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Non définie'
const remainingCents = (invoice: PortalInvoice) => Math.max(0, Number(invoice.total_cents || 0) - Number(invoice.paid_amount_cents || 0))
const progress = (project: PortalProject) => {
  const milestones = project.milestones || []
  if (!milestones.length) return 0
  return Math.round(milestones.filter(item => item.status === 'done').length / milestones.length * 100)
}

const quoteStatusLabel: Record<string, string> = { sent: 'Votre décision est attendue', accepted: 'Accepté', rejected: 'Refusé' }
const invoiceStatusLabel: Record<string, string> = { sent: 'À régler', overdue: 'En retard', paid: 'Payée', cancelled: 'Annulée', draft: 'Brouillon' }
const paymentMethodLabel: Record<string, string> = { twint: 'TWINT', swiss_qr: 'QR-facture', bank_transfer: 'Virement bancaire', cash: 'Espèces', other: 'Autre' }
const milestoneStatusLabel: Record<string, string> = { pending: 'À venir', in_progress: 'En cours', done: 'Terminé', blocked: 'Bloqué' }
const noteKindLabel: Record<string, string> = { meeting: 'Réunion', note: 'Mise à jour', decision: 'Décision' }

const outstandingCents = computed(() => (data.value?.invoices || []).reduce((sum, invoice) => sum + remainingCents(invoice), 0))
const pendingQuotes = computed(() => (data.value?.quotes || []).filter(quote => quote.status === 'sent'))
const availableDeliverables = computed(() => (data.value?.projects || []).reduce((sum, project) => sum + (project.deliverables?.length || 0), 0))
const latestDeliverable = computed(() => (data.value?.projects || []).flatMap(project => (project.deliverables || []).map(deliverable => ({ ...deliverable, projectTitle: project.title }))).at(0) || null)

async function loadPortal() {
  loading.value = true
  loadError.value = false
  try {
    data.value = await $fetch<PortalData>('/api/portal/overview', { headers: auth.authHeader() })
  }
  catch {
    data.value = null
    loadError.value = true
  }
  finally { loading.value = false }
}

onMounted(loadPortal)

async function logout() {
  await auth.logout()
  await navigateTo('/portal/login')
}

async function downloadDocument(kind: 'quote' | 'invoice', document: { id: number, number: string }) {
  const key = `${kind}-${document.id}`
  downloadingKey.value = key
  documentFeedback.value = null
  const endpoint = kind === 'quote' ? '/api/portal/quote-pdf' : '/api/portal/invoice-pdf'
  try {
    const blob = await $fetch<Blob>(endpoint, { query: { id: document.id }, headers: auth.authHeader(), responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = `${kind === 'quote' ? 'devis' : 'facture'}-${document.number}.pdf`
    link.click()
    URL.revokeObjectURL(url)
    documentFeedback.value = { key, type: 'success', message: `${kind === 'quote' ? 'Le devis' : 'La facture'} ${document.number} a été téléchargé.` }
  }
  catch {
    documentFeedback.value = { key, type: 'error', message: `Le document ${document.number} n’a pas pu être téléchargé. Actualisez la page puis réessayez.` }
  }
  finally { downloadingKey.value = '' }
}

function askForDecision(quote: PortalQuote, decision: 'accepted' | 'rejected', returnFocusId: string) {
  decidingQuoteId.value = quote.id
  proposedDecision.value = decision
  decisionReturnFocusId.value = returnFocusId
  decisionErrorMessage.value = ''
}

async function returnDecisionFocus() {
  const id = decisionReturnFocusId.value
  await nextTick()
  if (id) window.document.getElementById(id)?.focus()
}

async function cancelDecision() {
  decidingQuoteId.value = null
  proposedDecision.value = null
  decisionErrorMessage.value = ''
  await returnDecisionFocus()
}

async function submitDecision(quote: PortalQuote) {
  if (!proposedDecision.value || decidingQuoteId.value !== quote.id) return
  decisionLoading.value = true
  decisionErrorMessage.value = ''
  try {
    const decision = proposedDecision.value
    await $fetch(decision === 'accepted' ? '/api/portal/quotes/accept' : '/api/portal/quotes/reject', {
      method: 'POST',
      body: { quoteId: quote.id, confirmed: true },
      headers: auth.authHeader(),
    })
    if (data.value) data.value.quotes = data.value.quotes.map(item => item.id === quote.id ? { ...item, status: decision } : item)
    decisionAnnouncement.value = `Votre décision pour le devis ${quote.number} a été enregistrée : ${decision === 'accepted' ? 'accepté' : 'refusé'}.`
    await cancelDecision()
  }
  catch (decisionError: any) {
    decisionErrorMessage.value = decisionError?.data?.message || 'Votre décision n’a pas pu être enregistrée. Actualisez la page puis réessayez.'
  }
  finally { decisionLoading.value = false }
}

async function payWithTwint(invoice: PortalInvoice) {
  payingId.value = invoice.id
  paymentErrorMessage.value = ''
  try {
    const checkout = await $fetch<{ url: string }>('/api/portal/twint-checkout', {
      method: 'POST',
      body: { invoiceId: invoice.id },
      headers: auth.authHeader(),
    })
    await navigateTo(checkout.url, { external: true })
  }
  catch (paymentError: any) {
    paymentErrorMessage.value = paymentError?.data?.message || 'Le paiement TWINT n’a pas pu être démarré. Téléchargez la QR-facture ou contactez Antoine.'
  }
  finally { payingId.value = null }
}

const canPayWithTwint = (invoice: PortalInvoice) => data.value?.payments.twintAvailable
  && invoice.document_type !== 'credit_note'
  && invoice.currency === 'CHF'
  && invoice.status !== 'cancelled'
  && remainingCents(invoice) > 0
</script>

<template>
  <div class="min-h-screen bg-[#f7f8ff] text-gray-950 dark:bg-[#080811] dark:text-white">
    <!--
    THESIS: Un espace de collaboration qui montre le prochain pas, pas un empilement de documents.
    OWN-WORLD: Surfaces calmes nuit studio, violet pour l’action, cyan pour les livrables et états utiles.
    STORY: Le client comprend l’avancement, décide sur ses devis, récupère ses livrables et règle ses factures.
    FIRST VIEWPORT: Identité et navigation compacte, accueil personnel, puis bandeau de synthèse orienté action.
    FORM: Cockpit chronologique, extension directe de l’espace existant; seed portal-client-v2-operate.
    FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
    -->
    <header class="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0d0d16]/90">
      <div class="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4">
        <NuxtLink to="/" class="group min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
          <p class="truncate font-display text-sm font-semibold text-gray-950 dark:text-white">Antoine Quarroz</p>
          <p class="truncate text-xs text-gray-500 dark:text-gray-400">Espace client sécurisé</p>
        </NuxtLink>
        <nav class="hidden items-center gap-1 md:flex" aria-label="Navigation de l’espace client">
          <a href="#projets" class="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white">Projets</a>
          <a href="#devis" class="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white">Devis</a>
          <a href="#factures" class="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white">Factures</a>
        </nav>
        <button class="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:bg-white/[0.06]" @click="logout">Se déconnecter</button>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <div v-if="loading" role="status" aria-live="polite" class="space-y-5">
        <span class="sr-only">Chargement de votre espace client</span>
        <div class="h-24 animate-pulse rounded-2xl bg-gray-200/70 dark:bg-white/[0.06]" />
        <div class="grid gap-3 sm:grid-cols-3"><div v-for="index in 3" :key="index" class="h-24 animate-pulse rounded-xl bg-gray-200/70 dark:bg-white/[0.06]" /></div>
        <div class="h-72 animate-pulse rounded-2xl bg-gray-200/70 dark:bg-white/[0.06]" />
      </div>

      <div v-else-if="loadError" role="alert" class="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6 text-center dark:border-red-500/20 dark:bg-[#111118]">
        <h1 class="font-display text-xl font-semibold">Votre espace ne peut pas être chargé</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Vérifiez votre connexion. Si le problème persiste, demandez à Antoine de contrôler le lien avec votre fiche client.</p>
        <button class="mt-5 min-h-11 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111118]" @click="loadPortal">Réessayer</button>
      </div>

      <template v-else-if="data">
        <p class="sr-only" aria-live="polite" aria-atomic="true">{{ decisionAnnouncement }}</p>
        <div v-if="route.query.payment === 'success'" role="status" class="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">Paiement TWINT confirmé. La facture s’actualisera automatiquement dans quelques instants.</div>
        <div v-else-if="route.query.payment === 'cancelled'" role="status" class="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">Paiement interrompu. Aucun débit n’a été effectué.</div>
        <div v-if="paymentErrorMessage" role="alert" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100">{{ paymentErrorMessage }}</div>

        <section aria-labelledby="portal-title" class="relative overflow-hidden rounded-2xl border border-violet-200/70 bg-white px-5 py-7 shadow-sm dark:border-violet-500/20 dark:bg-[#111118] sm:px-8 sm:py-9">
          <div class="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
          <div class="relative max-w-3xl">
            <h1 id="portal-title" class="max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-4xl">Bonjour {{ data.client.name }}. Votre collaboration, clairement suivie.</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">Projets, décisions, livrables et paiements sont réunis ici. Les éléments qui demandent votre attention apparaissent en premier.</p>
          </div>
        </section>

        <section aria-labelledby="portal-priorities" class="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
          <div class="border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5"><h2 id="portal-priorities" class="font-display text-base font-semibold">À traiter maintenant</h2></div>
          <ol class="divide-y divide-gray-100 dark:divide-white/[0.06]">
            <li v-if="pendingQuotes[0]"><a href="#devis" class="group flex min-h-16 items-center justify-between gap-4 px-4 py-3 hover:bg-violet-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 dark:hover:bg-violet-500/[0.07] sm:px-5"><div><p class="text-xs font-semibold text-violet-700 dark:text-violet-300">Décision requise</p><p class="mt-0.5 text-sm font-semibold">Répondre au devis {{ pendingQuotes[0].number }}</p></div><span class="text-sm font-semibold text-violet-700 dark:text-violet-300">{{ money(pendingQuotes[0].total_cents, pendingQuotes[0].currency) }}</span></a></li>
            <li v-if="outstandingCents > 0"><a href="#factures" class="group flex min-h-16 items-center justify-between gap-4 px-4 py-3 hover:bg-violet-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 dark:hover:bg-violet-500/[0.07] sm:px-5"><div><p class="text-xs font-semibold text-amber-800 dark:text-amber-200">Paiement à organiser</p><p class="mt-0.5 text-sm font-semibold">Consulter les factures ouvertes</p></div><span class="text-sm font-semibold tabular-nums">{{ money(outstandingCents) }}</span></a></li>
            <li v-if="latestDeliverable"><a :href="latestDeliverable.url || '#projets'" :target="latestDeliverable.url ? '_blank' : undefined" rel="noopener noreferrer" class="group flex min-h-16 items-center justify-between gap-4 px-4 py-3 hover:bg-cyan-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 dark:hover:bg-cyan-500/[0.07] sm:px-5"><div><p class="text-xs font-semibold text-cyan-800 dark:text-cyan-200">Nouveau livrable</p><p class="mt-0.5 text-sm font-semibold">{{ latestDeliverable.title }} · {{ latestDeliverable.projectTitle }}</p></div><svg v-if="latestDeliverable.url" aria-hidden="true" class="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 3h7v7m0-7L10 14M5 7v12h12v-5" /></svg></a></li>
            <li v-if="!pendingQuotes.length && outstandingCents <= 0 && !latestDeliverable" class="px-4 py-5 text-sm text-gray-600 dark:text-gray-300 sm:px-5">Tout est à jour. Les prochains éléments apparaîtront ici.</li>
          </ol>
        </section>

        <section id="projets" aria-labelledby="portal-projects" class="scroll-mt-24 pt-12">
          <div class="max-w-2xl"><h2 id="portal-projects" class="font-display text-2xl font-semibold">Vos projets</h2><p class="mt-2 text-sm text-gray-600 dark:text-gray-400">L’avancement, les prochaines étapes et les éléments partagés par Antoine.</p></div>
          <div v-if="data.projects.length" class="mt-5 space-y-4">
            <article v-for="project in data.projects" :key="project.id" class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
              <div class="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2"><span class="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">{{ project.category }}</span><span class="text-xs text-gray-500 dark:text-gray-400">{{ progress(project) }} % réalisé</span></div>
                  <h3 class="mt-3 font-display text-xl font-semibold">{{ project.title }}</h3>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">{{ project.description }}</p>
                  <div v-if="project.milestones?.length" class="mt-5">
                    <div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]" aria-hidden="true"><div class="h-full rounded-full bg-violet-600 transition-[width] duration-500" :style="{ width: `${progress(project)}%` }" /></div>
                    <ol class="mt-4 space-y-3" aria-label="Jalons du projet">
                      <li v-for="milestone in project.milestones.slice(0, 4)" :key="milestone.id" class="flex gap-3 text-sm">
                        <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" :class="milestone.status === 'done' ? 'bg-violet-600' : milestone.status === 'in_progress' ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-gray-600'" />
                        <div class="min-w-0 flex-1"><div class="flex flex-wrap items-baseline justify-between gap-2"><p class="font-semibold text-gray-800 dark:text-gray-100">{{ milestone.title }}</p><p class="text-xs text-gray-500 dark:text-gray-400">{{ milestoneStatusLabel[milestone.status] || milestone.status }} · {{ formatDate(milestone.due_at) }}</p></div></div>
                      </li>
                    </ol>
                  </div>
                  <a v-if="project.live_url" :href="project.live_url" target="_blank" rel="noopener noreferrer" class="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-violet-200 px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-500/30 dark:text-violet-300 dark:hover:bg-violet-500/10">Voir le projet <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 3h7v7m0-7L10 14M5 7v12h12v-5" /></svg></a>
                </div>
                <aside class="space-y-5 border-t border-gray-100 pt-5 dark:border-white/[0.06] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <div><h4 class="text-sm font-semibold">Livrables</h4><div v-if="project.deliverables?.length" class="mt-2 space-y-1"><a v-for="deliverable in project.deliverables" :key="deliverable.id" :href="deliverable.url || undefined" target="_blank" rel="noopener noreferrer" class="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 text-sm text-cyan-800 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-200 dark:hover:bg-cyan-500/10"><span class="truncate font-semibold">{{ deliverable.title }}</span><svg v-if="deliverable.url" aria-hidden="true" class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 3h7v7m0-7L10 14M5 7v12h12v-5" /></svg></a></div><p v-else class="mt-2 text-sm text-gray-500 dark:text-gray-400">Aucun livrable publié pour le moment.</p></div>
                  <div v-if="project.notes?.length"><h4 class="text-sm font-semibold">Dernières nouvelles</h4><div class="mt-3 space-y-3"><div v-for="note in project.notes.slice(0, 2)" :key="note.id"><p class="text-xs font-semibold text-violet-700 dark:text-violet-300">{{ noteKindLabel[note.kind] || 'Mise à jour' }} · {{ formatDate(note.occurred_at) }}</p><p class="mt-1 text-sm font-medium">{{ note.title }}</p><p v-if="note.content" class="mt-1 line-clamp-3 text-xs leading-5 text-gray-500 dark:text-gray-400">{{ note.content }}</p></div></div></div>
                </aside>
              </div>
            </article>
          </div>
          <div v-else class="mt-5 rounded-xl border border-dashed border-gray-300 p-7 text-center dark:border-white/15"><p class="font-semibold">Aucun projet partagé</p><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Vos projets apparaîtront ici dès leur création.</p></div>
        </section>

        <section id="devis" aria-labelledby="portal-quotes" class="scroll-mt-24 pt-12">
          <div class="max-w-2xl"><h2 id="portal-quotes" class="font-display text-2xl font-semibold">Vos devis</h2><p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Consultez le document avant d’enregistrer votre décision définitive.</p></div>
          <div v-if="data.quotes.length" class="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
            <article v-for="quote in data.quotes" :key="quote.id" class="border-b border-gray-100 p-4 last:border-0 dark:border-white/[0.06] sm:p-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h3 class="font-semibold">{{ quote.title || `Devis ${quote.number}` }}</h3><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="quote.status === 'sent' ? 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200' : quote.status === 'accepted' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200' : 'bg-gray-100 text-gray-700 dark:bg-white/[0.08] dark:text-gray-300'">{{ quoteStatusLabel[quote.status] || quote.status }}</span></div><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ quote.number }} · {{ money(quote.total_cents, quote.currency) }} · valable jusqu’au {{ formatDate(quote.valid_until) }}</p></div>
                <div class="flex flex-wrap gap-2"><button :id="`quote-pdf-${quote.id}`" type="button" :disabled="downloadingKey === `quote-${quote.id}`" class="min-h-11 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:text-gray-200 dark:hover:border-violet-400/50 dark:hover:text-violet-200" @click="downloadDocument('quote', quote)">{{ downloadingKey === `quote-${quote.id}` ? 'Préparation…' : 'Télécharger le PDF' }}</button><template v-if="quote.status === 'sent'"><button :id="`quote-accept-${quote.id}`" type="button" class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111118]" @click="askForDecision(quote, 'accepted', `quote-pdf-${quote.id}`)">Accepter</button><button :id="`quote-reject-${quote.id}`" type="button" class="min-h-11 rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:focus-visible:ring-offset-[#111118]" @click="askForDecision(quote, 'rejected', `quote-pdf-${quote.id}`)">Refuser</button></template></div>
              </div>
              <p v-if="documentFeedback?.key === `quote-${quote.id}`" :role="documentFeedback.type === 'error' ? 'alert' : 'status'" class="mt-3 rounded-lg border px-3 py-2 text-sm" :class="documentFeedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100'">{{ documentFeedback.message }}</p>
              <div v-if="decidingQuoteId === quote.id" class="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.04]" :aria-busy="decisionLoading">
                <p class="text-sm font-semibold">{{ proposedDecision === 'accepted' ? 'Confirmer l’acceptation de ce devis ?' : 'Confirmer le refus de ce devis ?' }}</p><p class="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">Cette décision sera immédiatement visible par Antoine. Pour demander une modification, contactez-le avant de confirmer.</p>
                <p v-if="decisionErrorMessage" role="alert" class="mt-3 text-sm text-red-700 dark:text-red-300">{{ decisionErrorMessage }}</p>
                <div class="mt-3 flex flex-wrap gap-2"><button type="button" :disabled="decisionLoading" class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-offset-[#15151d]" @click="submitDecision(quote)">{{ decisionLoading ? 'Enregistrement…' : 'Confirmer ma décision' }}</button><button type="button" :disabled="decisionLoading" class="min-h-11 rounded-lg px-4 text-sm font-semibold text-gray-600 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:text-gray-300 dark:hover:bg-white/[0.08] dark:focus-visible:ring-offset-[#15151d]" @click="cancelDecision">Annuler</button></div>
              </div>
            </article>
          </div>
          <div v-else class="mt-5 rounded-xl border border-dashed border-gray-300 p-7 text-center dark:border-white/15"><p class="font-semibold">Aucun devis disponible</p><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Les devis envoyés apparaîtront ici.</p></div>
        </section>

        <section id="factures" aria-labelledby="portal-invoices" class="scroll-mt-24 pb-12 pt-12">
          <div class="max-w-2xl"><h2 id="portal-invoices" class="font-display text-2xl font-semibold">Factures et paiements</h2><p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Téléchargez la facture avec son QR suisse ou réglez le solde avec TWINT dès son activation.</p></div>
          <div v-if="data.invoices.length" class="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
            <article v-for="invoice in data.invoices" :key="invoice.id" class="border-b border-gray-100 p-4 last:border-0 dark:border-white/[0.06] sm:p-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div><div class="flex flex-wrap items-center gap-2"><h3 class="font-semibold">{{ invoice.document_type === 'credit_note' ? 'Avoir' : 'Facture' }} {{ invoice.number }}</h3><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200' : invoice.status === 'overdue' ? 'bg-red-50 text-red-800 dark:bg-red-400/10 dark:text-red-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200'">{{ invoiceStatusLabel[invoice.status] || invoice.status }}</span></div><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Émise le {{ formatDate(invoice.issued_at) }} · échéance {{ formatDate(invoice.due_at) }}</p><p class="mt-2 font-display text-xl font-semibold tabular-nums">{{ money(invoice.total_cents, invoice.currency) }}</p><p v-if="remainingCents(invoice) > 0 && invoice.document_type !== 'credit_note'" class="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-200">Solde à régler : {{ money(remainingCents(invoice), invoice.currency) }}</p></div>
                <div class="flex flex-wrap gap-2"><button type="button" :disabled="downloadingKey === `invoice-${invoice.id}`" class="min-h-11 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:text-gray-200 dark:hover:border-violet-400/50 dark:hover:text-violet-200" @click="downloadDocument('invoice', invoice)">{{ downloadingKey === `invoice-${invoice.id}` ? 'Préparation…' : 'PDF et QR-facture' }}</button><button v-if="canPayWithTwint(invoice)" type="button" :disabled="payingId === invoice.id" class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-offset-[#111118]" @click="payWithTwint(invoice)">{{ payingId === invoice.id ? 'Ouverture de TWINT…' : 'Payer avec TWINT' }}</button></div>
              </div>
              <p v-if="documentFeedback?.key === `invoice-${invoice.id}`" :role="documentFeedback.type === 'error' ? 'alert' : 'status'" class="mt-3 rounded-lg border px-3 py-2 text-sm" :class="documentFeedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100'">{{ documentFeedback.message }}</p>
              <details v-if="invoice.payments?.length" class="mt-4 rounded-lg bg-gray-50 px-4 py-3 dark:bg-white/[0.04]"><summary class="cursor-pointer text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">Historique des paiements ({{ invoice.payments.length }})</summary><ul class="mt-3 space-y-2"><li v-for="payment in invoice.payments" :key="payment.id" class="flex flex-wrap items-center justify-between gap-2 text-sm"><span class="text-gray-600 dark:text-gray-300">{{ paymentMethodLabel[payment.method] || payment.method }} · {{ formatDate(payment.paid_at) }}</span><span class="font-semibold tabular-nums">{{ money(payment.amount_cents, payment.currency) }}</span></li></ul></details>
            </article>
          </div>
          <div v-else class="mt-5 rounded-xl border border-dashed border-gray-300 p-7 text-center dark:border-white/15"><p class="font-semibold">Aucune facture disponible</p><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Les factures envoyées apparaîtront ici.</p></div>
        </section>
      </template>
    </main>
  </div>
</template>
