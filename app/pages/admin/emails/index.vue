<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

type EmailStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed'

interface EmailRow {
  id: string
  messageId: string | null
  to: string[]
  from: string
  subject: string
  createdAt: string
  status: EmailStatus
  tags: Array<{ name: string, value: string }>
}

interface EmailResponse {
  emails: EmailRow[]
  counts: { total: number, delivered: number, engaged: number, attention: number, pending: number }
  hasMore: boolean
  nextCursor: string | null
}

const auth = useAuthStore()
const emails = ref<EmailRow[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref('')
const hasMore = ref(false)
const nextCursor = ref<string | null>(null)
const search = ref('')
const statusFilter = ref<'all' | EmailStatus>('all')

const statusMeta: Record<EmailStatus, { label: string, dot: string, badge: string }> = {
  queued: { label: 'En file', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-slate-300' },
  sent: { label: 'Envoyé', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' },
  delivered: { label: 'Livré', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' },
  opened: { label: 'Ouvert', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' },
  clicked: { label: 'Cliqué', dot: 'bg-cyan-500', badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300' },
  bounced: { label: 'Rebond', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-800 dark:bg-orange-500/10 dark:text-orange-300' },
  complained: { label: 'Signalé', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
  failed: { label: 'Échec', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
}

const filters: Array<{ value: 'all' | EmailStatus, label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'delivered', label: 'Livrés' },
  { value: 'opened', label: 'Ouverts' },
  { value: 'clicked', label: 'Cliqués' },
  { value: 'failed', label: 'À surveiller' },
]

const filteredEmails = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('fr')
  return emails.value.filter((email) => {
    const statusMatches = statusFilter.value === 'all'
      || (statusFilter.value === 'failed'
        ? ['failed', 'bounced', 'complained'].includes(email.status)
        : email.status === statusFilter.value)
    if (!statusMatches) return false
    if (!query) return true
    return [email.subject, email.from, ...email.to, ...email.tags.flatMap(tag => [tag.name, tag.value])]
      .some(value => value.toLocaleLowerCase('fr').includes(query))
  })
})

const counts = computed(() => emails.value.reduce((summary, email) => {
  summary.total += 1
  if (['delivered', 'opened', 'clicked'].includes(email.status)) summary.delivered += 1
  if (['opened', 'clicked'].includes(email.status)) summary.engaged += 1
  if (['bounced', 'complained', 'failed'].includes(email.status)) summary.attention += 1
  if (['queued', 'sent'].includes(email.status)) summary.pending += 1
  return summary
}, { total: 0, delivered: 0, engaged: 0, attention: 0, pending: 0 }))

function category(email: EmailRow) {
  return email.tags.find(tag => tag.name === 'category')?.value?.replaceAll('_', ' ') || 'transactionnel'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date inconnue'
  return new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

async function fetchEmails({ append = false } = {}) {
  if (append) loadingMore.value = true
  else loading.value = true
  loadError.value = ''
  try {
    const result = await $fetch<EmailResponse>('/api/admin/emails', {
      headers: auth.authHeader(),
      query: { limit: 40, after: append ? nextCursor.value || undefined : undefined },
    })
    emails.value = append ? [...emails.value, ...result.emails] : result.emails
    hasMore.value = result.hasMore
    nextCursor.value = result.nextCursor
  }
  catch {
    loadError.value = 'L’historique Lumail ne peut pas être chargé. Vérifie la connexion puis réessaie.'
  }
  finally {
    loading.value = false
    loadingMore.value = false
  }
}

onMounted(() => fetchEmails())
</script>

<template>
  <!--
    THESIS: transformer les événements Lumail en file de contrôle immédiatement exploitable, sans faux tableau de bord global.
    OWN-WORLD: surfaces administratives calmes, accent violet réservé à l’action et couleurs sémantiques réservées aux statuts.
    STORY: voir la santé des derniers envois, isoler un incident, puis ouvrir Lumail si une investigation est nécessaire.
    FIRST VIEWPORT: titre et actions, quatre mesures compactes, recherche et filtres avant le journal chronologique.
    FORM: journal opérationnel dense; seed key lumail-delivery-ledger.
    FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
  -->
  <div class="space-y-5">
    <section class="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:p-5">
      <div class="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <h1 class="font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Suivi des e-mails</h1>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">Contrôle les derniers envois transactionnels effectués par Lumail, de la mise en file jusqu’à l’engagement.</p>
        </div>
        <div class="flex shrink-0 gap-2">
          <a href="https://lumail.io/" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-200">Ouvrir Lumail</a>
          <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:ring-offset-[#111118]" :disabled="loading" @click="fetchEmails()">
            <AdminIcon icon="refresh-cw" class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
            {{ loading ? 'Actualisation…' : 'Actualiser' }}
          </button>
        </div>
      </div>
    </section>

    <section aria-label="Résumé des e-mails chargés" class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/[0.06] lg:grid-cols-4 lg:divide-y-0">
        <div class="p-4 sm:p-5">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Chargés</p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-gray-950 dark:text-white">{{ counts.total }}</p>
        </div>
        <div class="p-4 sm:p-5">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Livrés</p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{{ counts.delivered }}</p>
        </div>
        <div class="p-4 sm:p-5">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Engagés</p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-violet-700 dark:text-violet-300">{{ counts.engaged }}</p>
        </div>
        <div class="p-4 sm:p-5">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">À surveiller</p>
          <p class="mt-2 text-2xl font-semibold tabular-nums" :class="counts.attention ? 'text-red-700 dark:text-red-300' : 'text-gray-950 dark:text-white'">{{ counts.attention }}</p>
        </div>
      </div>
      <p class="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500 dark:border-white/[0.06] dark:text-gray-400">Ces chiffres concernent uniquement les {{ counts.total }} e-mails actuellement chargés.</p>
    </section>

    <section class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="border-b border-gray-100 p-3 dark:border-white/[0.06] sm:p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="overflow-x-auto pb-1" role="group" aria-label="Filtrer par statut">
            <div class="flex min-w-max gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.05]">
              <button v-for="filter in filters" :key="filter.value" type="button" class="min-h-9 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" :class="statusFilter === filter.value ? 'bg-white text-gray-950 shadow-sm dark:bg-white/[0.1] dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'" :aria-pressed="statusFilter === filter.value" @click="statusFilter = filter.value">{{ filter.label }}</button>
            </div>
          </div>
          <div class="relative w-full lg:max-w-xs">
            <AdminIcon icon="search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <label for="email-search" class="sr-only">Rechercher un e-mail</label>
            <input id="email-search" v-model="search" type="search" class="input-field min-h-11 w-full !pl-10 text-sm" placeholder="Sujet, destinataire, catégorie…">
          </div>
        </div>
      </div>

      <div v-if="loading && !emails.length" role="status" class="grid min-h-64 place-items-center p-6">
        <div class="text-center"><div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /><p class="mt-3 text-sm text-gray-500 dark:text-gray-400">Connexion à Lumail…</p></div>
      </div>
      <div v-else-if="loadError && !emails.length" role="alert" class="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100">
        <p class="font-semibold">Historique indisponible</p><p class="mt-1 text-sm">{{ loadError }}</p><button type="button" class="mt-4 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white" @click="fetchEmails()">Réessayer</button>
      </div>
      <AdminEmptyState v-else-if="!filteredEmails.length" :title="emails.length ? 'Aucun e-mail ne correspond' : 'Aucun envoi récent'" :body="emails.length ? 'Modifie le filtre ou la recherche pour retrouver un envoi.' : 'Les prochains e-mails envoyés par l’application apparaîtront ici.'" />

      <div v-else>
        <div class="hidden grid-cols-[minmax(0,1fr)_minmax(180px,0.75fr)_130px_170px] gap-4 border-b border-gray-100 px-5 py-2.5 text-xs font-semibold text-gray-500 dark:border-white/[0.06] dark:text-gray-400 md:grid">
          <span>E-mail</span><span>Destinataire</span><span>Statut</span><span>Date</span>
        </div>
        <ol class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <li v-for="email in filteredEmails" :key="email.id" class="p-4 transition-colors hover:bg-gray-50/70 dark:hover:bg-white/[0.025] sm:px-5">
            <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.75fr)_130px_170px] md:items-center md:gap-4">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-gray-900 dark:text-white" :title="email.subject">{{ email.subject || 'Sans objet' }}</p>
                <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span class="capitalize">{{ category(email) }}</span><span aria-hidden="true">·</span><span class="truncate">{{ email.from }}</span>
                </div>
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm text-gray-700 dark:text-gray-200" :title="email.to.join(', ')">{{ email.to[0] || 'Destinataire inconnu' }}</p>
                <p v-if="email.to.length > 1" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">+ {{ email.to.length - 1 }} autre(s)</p>
              </div>
              <div>
                <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusMeta[email.status].badge"><span class="h-1.5 w-1.5 rounded-full" :class="statusMeta[email.status].dot" />{{ statusMeta[email.status].label }}</span>
              </div>
              <time class="text-xs text-gray-500 dark:text-gray-400" :datetime="email.createdAt">{{ formatDate(email.createdAt) }}</time>
            </div>
          </li>
        </ol>
      </div>

      <div v-if="emails.length" class="border-t border-gray-100 p-4 dark:border-white/[0.06]">
        <div v-if="loadError" role="alert" class="mb-3 flex flex-col gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-400/10 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between">
          <span>{{ loadError }}</span><button type="button" class="min-h-9 shrink-0 rounded-md bg-red-700 px-3 text-xs font-semibold text-white" @click="fetchEmails()">Réessayer</button>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs text-gray-500 dark:text-gray-400"><strong class="font-semibold text-gray-700 dark:text-gray-200">Livré</strong> signifie accepté par le serveur destinataire, pas nécessairement lu.</p>
          <button v-if="hasMore" type="button" class="min-h-11 shrink-0 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait disabled:opacity-60 dark:border-white/[0.1] dark:text-gray-200" :disabled="loadingMore" @click="fetchEmails({ append: true })">{{ loadingMore ? 'Chargement…' : 'Charger plus' }}</button>
        </div>
      </div>
    </section>
  </div>
</template>
