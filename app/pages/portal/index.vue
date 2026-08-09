<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'portal' })

type LoadStatus = 'loading' | 'ready' | 'error'
type DocumentKind = 'quote' | 'invoice'

const auth = useAuthStore()
const route = useRoute()
const loadStatus = ref<LoadStatus>('loading')
const portal = ref<any>(null)
const activeProjectId = ref<number | null>(null)
const acceptingQuoteId = ref<number | null>(null)
const confirmedQuoteIds = ref<number[]>([])
const payingId = ref<number | null>(null)
const paymentStatus = ref<'idle' | 'checking' | 'confirmed' | 'pending' | 'cancelled' | 'error'>('idle')
const actionError = ref('')

const money = (cents: number, currency = 'CHF') => new Intl.NumberFormat('fr-CH', { style: 'currency', currency }).format(Number(cents || 0) / 100)
const dateLabel = (value?: string | null) => value
  ? new Intl.DateTimeFormat('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
  : 'Non définie'
const remainingCents = (invoice: any) => Math.max(0, Number(invoice.total_cents || 0) - Number(invoice.paid_amount_cents || 0))
const projectStatusLabel: Record<string, string> = {
  planning: 'Planification', active: 'En cours', review: 'En validation', delivered: 'Livré', paused: 'En pause',
}
const milestoneStatusLabel: Record<string, string> = {
  planned: 'À venir', in_progress: 'En cours', done: 'Terminé', blocked: 'Bloqué',
}
const quoteStatusLabel: Record<string, string> = {
  sent: 'À valider', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré', cancelled: 'Annulé',
}
const invoiceStatusLabel: Record<string, string> = {
  sent: 'À régler', partially_paid: 'Partiellement réglée', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée',
}

const activeProject = computed(() => portal.value?.projects?.find((project: any) => project.id === activeProjectId.value) || portal.value?.projects?.[0] || null)
const projectQuotes = computed(() => portal.value?.quotes?.filter((quote: any) => quote.project_id === activeProject.value?.id) || [])
const projectInvoices = computed(() => portal.value?.invoices?.filter((invoice: any) => invoice.project_id === activeProject.value?.id) || [])
const unassignedQuotes = computed(() => portal.value?.quotes?.filter((quote: any) => !quote.project_id) || [])
const unassignedInvoices = computed(() => portal.value?.invoices?.filter((invoice: any) => !invoice.project_id) || [])
const completedMilestones = computed(() => activeProject.value?.milestones?.filter((item: any) => item.status === 'done').length || 0)
const projectProgress = computed(() => activeProject.value?.milestones?.length
  ? Math.round(completedMilestones.value / activeProject.value.milestones.length * 100)
  : 0)

function isQuoteExpired(quote: any) {
  return quote.status === 'sent' && quote.valid_until && quote.valid_until < new Date().toISOString().slice(0, 10)
}
function canAcceptQuote(quote: any) {
  return quote.status === 'sent' && !isQuoteExpired(quote)
}
function canPayWithTwint(invoice: any) {
  return portal.value?.payments?.twintAvailable
    && invoice.document_type !== 'credit_note'
    && invoice.currency === 'CHF'
    && !['paid', 'cancelled'].includes(invoice.status)
    && remainingCents(invoice) > 0
    && remainingCents(invoice) <= 500_000
}
function setActiveProject(id: number) {
  activeProjectId.value = id
}

async function loadPortal() {
  loadStatus.value = 'loading'
  actionError.value = ''
  try {
    portal.value = await $fetch('/api/portal/overview', { headers: auth.authHeader() })
    if (!activeProjectId.value && portal.value.projects?.length) activeProjectId.value = portal.value.projects[0].id
    loadStatus.value = 'ready'
  }
  catch (error: any) {
    portal.value = null
    loadStatus.value = 'error'
    actionError.value = error?.data?.message || 'Votre espace client ne peut pas être chargé pour le moment.'
  }
}
async function logout() {
  await auth.logout()
  await navigateTo('/portal/login')
}
async function downloadDocument(kind: DocumentKind, document: { id: number, number: string }) {
  actionError.value = ''
  try {
    const blob = await $fetch<Blob>(kind === 'quote' ? '/api/portal/quote-pdf' : '/api/portal/invoice-pdf', {
      query: { id: document.id }, headers: auth.authHeader(), responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = `${kind === 'quote' ? 'devis' : 'facture'}-${document.number}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }
  catch (error: any) { actionError.value = error?.data?.message || 'Le document ne peut pas être téléchargé.' }
}
async function acceptQuote(quote: any) {
  if (!confirmedQuoteIds.value.includes(quote.id) || acceptingQuoteId.value) return
  acceptingQuoteId.value = quote.id
  actionError.value = ''
  try {
    await $fetch('/api/portal/quotes/accept', {
      method: 'POST', body: { quoteId: quote.id, confirmed: true }, headers: auth.authHeader(),
    })
    confirmedQuoteIds.value = confirmedQuoteIds.value.filter(id => id !== quote.id)
    await loadPortal()
  }
  catch (error: any) { actionError.value = error?.data?.message || 'Le devis n’a pas pu être accepté.' }
  finally { acceptingQuoteId.value = null }
}
async function payWithTwint(invoice: any) {
  payingId.value = invoice.id
  actionError.value = ''
  try {
    const checkout = await $fetch<{ url: string }>('/api/portal/twint-checkout', {
      method: 'POST', body: { invoiceId: invoice.id }, headers: auth.authHeader(),
    })
    await navigateTo(checkout.url, { external: true })
  }
  catch (error: any) { actionError.value = error?.data?.message || 'Le paiement TWINT n’a pas pu être démarré.' }
  finally { payingId.value = null }
}
async function verifyPaymentReturn() {
  if (route.query.payment === 'cancelled') {
    paymentStatus.value = 'cancelled'
    return
  }
  const sessionId = String(route.query.session_id || '')
  if (route.query.payment !== 'success' || !sessionId) return
  paymentStatus.value = 'checking'
  try {
    const session = await $fetch<{ status: string }>('/api/portal/twint-status', { query: { sessionId }, headers: auth.authHeader() })
    paymentStatus.value = session.status === 'completed' ? 'confirmed' : 'pending'
    await loadPortal()
  }
  catch { paymentStatus.value = 'error' }
}

onMounted(async () => {
  await loadPortal()
  await verifyPaymentReturn()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-950 dark:bg-[#080811] dark:text-white">
    <header class="sticky top-0 z-20 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0d0d15]/90">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p class="font-display font-semibold">Antoine Quarroz</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Espace client sécurisé</p>
        </div>
        <button type="button" class="min-h-11 rounded-lg px-3 text-sm text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:bg-white/[0.06]" @click="logout">Se déconnecter</button>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-7 sm:py-10">
      <div v-if="loadStatus === 'loading'" role="status" class="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500 dark:border-white/[0.08] dark:bg-[#111118] dark:text-gray-400">Chargement de votre espace…</div>
      <div v-else-if="loadStatus === 'error'" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100">
        <p class="font-semibold">Votre espace n’est pas disponible.</p>
        <p class="mt-1 text-sm">{{ actionError }}</p>
        <button type="button" class="mt-4 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white" @click="loadPortal">Réessayer</button>
      </div>

      <template v-else-if="portal">
        <div v-if="paymentStatus === 'checking'" role="status" class="mb-5 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">Vérification du paiement TWINT…</div>
        <div v-else-if="paymentStatus === 'confirmed'" role="status" class="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100"><strong>Paiement confirmé.</strong> Votre facture a été actualisée.</div>
        <div v-else-if="paymentStatus === 'pending'" role="status" class="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">Le paiement est reçu par TWINT et sa confirmation est encore en cours. Rechargez la page dans quelques instants.</div>
        <div v-else-if="paymentStatus === 'cancelled'" role="status" class="mb-5 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-[#111118] dark:text-gray-200">Paiement interrompu : aucun débit n’a été effectué.</div>
        <div v-else-if="paymentStatus === 'error'" role="alert" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100">Le statut du paiement ne peut pas être vérifié. Consultez la facture ou contactez Antoine avant de réessayer.</div>
        <div v-if="actionError" role="alert" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100">{{ actionError }}</div>

        <section class="border-b border-gray-200 pb-7 dark:border-white/[0.08]">
          <p class="text-sm font-semibold text-violet-700 dark:text-violet-300">{{ portal.organization.name }}</p>
          <h1 class="mt-2 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">Bonjour {{ portal.client.name }}, voici l’avancement de votre collaboration.</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">Retrouvez les étapes, décisions, livrables et documents financiers partagés avec vous.</p>
        </section>

        <template v-if="portal.projects.length">
          <nav class="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Vos projets">
            <template v-for="project in portal.projects" :key="project.id">
              <button v-if="activeProject?.id === project.id" type="button" class="min-h-11 shrink-0 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" :aria-current="true" @click="setActiveProject(project.id)">{{ project.title }}</button>
              <button v-else type="button" class="min-h-11 shrink-0 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:border-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/10 dark:bg-[#111118] dark:text-gray-200" @click="setActiveProject(project.id)">{{ project.title }}</button>
            </template>
          </nav>

          <section v-if="activeProject" class="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
            <article class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118] sm:p-6">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">{{ activeProject.category }}</p>
                  <h2 class="mt-2 font-display text-2xl font-semibold">{{ activeProject.title }}</h2>
                </div>
                <span class="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">{{ projectStatusLabel[activeProject.workflow_status] || activeProject.workflow_status }}</span>
              </div>
              <p class="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{{ activeProject.description }}</p>
              <dl class="mt-5 grid grid-cols-2 gap-4 border-y border-gray-100 py-4 text-sm dark:border-white/[0.06]">
                <div><dt class="text-xs text-gray-500 dark:text-gray-400">Début</dt><dd class="mt-1 font-semibold">{{ dateLabel(activeProject.starts_at) }}</dd></div>
                <div><dt class="text-xs text-gray-500 dark:text-gray-400">Objectif</dt><dd class="mt-1 font-semibold">{{ dateLabel(activeProject.target_at) }}</dd></div>
              </dl>
              <div class="mt-5">
                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"><span>Jalons terminés</span><strong>{{ completedMilestones }}/{{ activeProject.milestones.length }} · {{ projectProgress }} %</strong></div>
                <div class="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.07]"><div class="h-full rounded-full bg-violet-600" :style="{ width: `${projectProgress}%` }" /></div>
                <ol v-if="activeProject.milestones.length" class="mt-5 space-y-3">
                  <li v-for="milestone in activeProject.milestones" :key="milestone.id" class="flex items-start gap-3">
                    <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" :class="milestone.status === 'done' ? 'bg-cyan-500' : milestone.status === 'blocked' ? 'bg-red-500' : 'bg-violet-500'" />
                    <div class="min-w-0 flex-1"><p class="text-sm font-medium">{{ milestone.title }}</p><p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ milestoneStatusLabel[milestone.status] }} · {{ dateLabel(milestone.due_at) }}</p></div>
                  </li>
                </ol>
                <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">Les premières étapes seront affichées ici dès leur planification.</p>
              </div>
              <a v-if="activeProject.live_url" :href="activeProject.live_url" target="_blank" rel="noopener noreferrer" class="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-violet-700 dark:text-violet-300">Ouvrir le projet ↗</a>
            </article>

            <div class="space-y-5">
              <section aria-labelledby="deliverables-heading" class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]">
                <h2 id="deliverables-heading" class="font-display text-lg font-semibold">Livrables</h2>
                <div v-if="activeProject.deliverables.length" class="mt-3 divide-y divide-gray-100 dark:divide-white/[0.06]">
                  <div v-for="deliverable in activeProject.deliverables" :key="deliverable.id" class="py-3">
                    <a v-if="deliverable.url" :href="deliverable.url" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-10 items-center text-sm font-semibold text-violet-700 dark:text-violet-300">{{ deliverable.title }} ↗</a>
                    <p v-else class="py-2 text-sm font-semibold">{{ deliverable.title }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ deliverable.status }}</p>
                  </div>
                </div>
                <p v-else class="mt-3 text-sm text-gray-500 dark:text-gray-400">Aucun livrable partagé pour le moment.</p>
              </section>
              <section aria-labelledby="notes-heading" class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]">
                <h2 id="notes-heading" class="font-display text-lg font-semibold">Dernières nouvelles</h2>
                <article v-for="note in activeProject.notes" :key="note.id" class="mt-4 border-l-2 border-violet-500 pl-3">
                  <p class="text-sm font-semibold">{{ note.title }}</p><p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-gray-300">{{ note.content }}</p><p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ dateLabel(note.occurred_at) }}</p>
                </article>
                <p v-if="!activeProject.notes.length" class="mt-3 text-sm text-gray-500 dark:text-gray-400">Aucune note partagée pour le moment.</p>
              </section>
            </div>
          </section>

          <section class="mt-8 grid gap-5 lg:grid-cols-2" aria-labelledby="project-documents-heading">
            <h2 id="project-documents-heading" class="sr-only">Documents du projet</h2>
            <PortalQuoteList :quotes="projectQuotes" :confirmed-ids="confirmedQuoteIds" :accepting-id="acceptingQuoteId" :money="money" :date-label="dateLabel" :status-label="quoteStatusLabel" :is-expired="isQuoteExpired" :can-accept="canAcceptQuote" @toggle-confirm="(id: number, checked: boolean) => confirmedQuoteIds = checked ? [...confirmedQuoteIds, id] : confirmedQuoteIds.filter(item => item !== id)" @download="(quote: any) => downloadDocument('quote', quote)" @accept="acceptQuote" />
            <PortalInvoiceList :invoices="projectInvoices" :paying-id="payingId" :money="money" :status-label="invoiceStatusLabel" :remaining-cents="remainingCents" :can-pay="canPayWithTwint" @download="(invoice: any) => downloadDocument('invoice', invoice)" @pay="payWithTwint" />
          </section>
        </template>

        <section v-else class="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#111118]">
          <h2 class="font-display text-xl font-semibold">Votre collaboration démarre ici</h2>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Aucun projet n’est encore publié dans votre espace. Les documents disponibles restent accessibles ci-dessous.</p>
        </section>

        <section v-if="unassignedQuotes.length || unassignedInvoices.length" class="mt-8 border-t border-gray-200 pt-7 dark:border-white/[0.08]">
          <h2 class="font-display text-xl font-semibold">Autres documents</h2>
          <div class="mt-4 grid gap-5 lg:grid-cols-2">
            <PortalQuoteList v-if="unassignedQuotes.length" :quotes="unassignedQuotes" :confirmed-ids="confirmedQuoteIds" :accepting-id="acceptingQuoteId" :money="money" :date-label="dateLabel" :status-label="quoteStatusLabel" :is-expired="isQuoteExpired" :can-accept="canAcceptQuote" @toggle-confirm="(id: number, checked: boolean) => confirmedQuoteIds = checked ? [...confirmedQuoteIds, id] : confirmedQuoteIds.filter(item => item !== id)" @download="(quote: any) => downloadDocument('quote', quote)" @accept="acceptQuote" />
            <PortalInvoiceList v-if="unassignedInvoices.length" :invoices="unassignedInvoices" :paying-id="payingId" :money="money" :status-label="invoiceStatusLabel" :remaining-cents="remainingCents" :can-pay="canPayWithTwint" @download="(invoice: any) => downloadDocument('invoice', invoice)" @pay="payWithTwint" />
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
