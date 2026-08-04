<script setup lang="ts">
import type { ContactMessage } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const clientId = computed(() => Number(route.params.id))

const clientsStore = useClientsStore()
const tasksStore = useTasksStore()
const quotesStore = useQuotesStore()
const invoicesStore = useInvoicesStore()
const appointmentsStore = useAppointmentsStore()
const projectsStore = useProjectsStore()
const auth = useAuthStore()
const { statusLabel } = useBusinessLabels()

const auditLogs = ref<Array<{ id: number, action: string, entity_type: string, entity_id: string | null, payload: any, created_at: string }>>([])
const relatedMessages = ref<ContactMessage[]>([])

const client = computed(() => clientsStore.clients.find(c => c.id === clientId.value) || null)
const clientTasks = computed(() => tasksStore.tasks.filter(t => t.clientId === clientId.value))
const clientQuotes = computed(() => quotesStore.quotes.filter(q => q.clientId === clientId.value))
const clientInvoices = computed(() => invoicesStore.invoices.filter(i => i.clientId === clientId.value))
const clientAppointments = computed(() => appointmentsStore.appointments.filter(a => a.clientId === clientId.value))
const clientProjects = computed(() => projectsStore.projects.filter(project => project.clientId === clientId.value))

const totalQuotes = computed(() => clientQuotes.value.reduce((sum, q) => sum + q.amountCents, 0))
const totalInvoices = computed(() => clientInvoices.value.reduce((sum, i) => sum + i.amountCents, 0))
const overdueInvoices = computed(() => clientInvoices.value.filter(i => i.status === 'overdue'))
const nextAppointment = computed(() => {
  const now = new Date().toISOString()
  return clientAppointments.value
    .filter(a => a.startsAt >= now && a.status === 'scheduled')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] || null
})
const acceptedQuote = computed(() => clientQuotes.value.find(quote => quote.status === 'accepted') || null)
const openInvoice = computed(() => clientInvoices.value.find(invoice => invoice.status === 'overdue')
  || clientInvoices.value.find(invoice => invoice.status === 'sent' || invoice.status === 'draft')
  || null)
const allInvoicesPaid = computed(() => clientInvoices.value.length > 0 && clientInvoices.value.every(invoice => invoice.status === 'paid'))
const pipelineIndex = computed(() => {
  if (client.value?.status === 'lead' && !clientQuotes.value.length) return 0
  if (!acceptedQuote.value) return 1
  if (!clientProjects.value.length) return 2
  if (!clientInvoices.value.length) return 3
  if (!allInvoicesPaid.value) return 4
  return 5
})
const pipelineStages = computed(() => [
  { label: 'Prospect', done: pipelineIndex.value > 0 },
  { label: 'Devis', done: pipelineIndex.value > 1 },
  { label: 'Projet', done: pipelineIndex.value > 2 },
  { label: 'Facture', done: pipelineIndex.value > 3 },
  { label: 'Payé', done: pipelineIndex.value > 4 },
])
const nextAction = computed(() => {
  if (!client.value) return null
  if (!clientQuotes.value.length) return { label: 'Créer et cadrer le premier devis', to: `/admin/quotes?new=1&clientId=${client.value.id}` }
  const draft = clientQuotes.value.find(quote => quote.status === 'draft')
  if (draft) return { label: `Finaliser et envoyer le devis ${draft.number}`, to: '/admin/quotes' }
  const sent = clientQuotes.value.find(quote => quote.status === 'sent')
  if (sent && !acceptedQuote.value) return { label: `Relancer le devis ${sent.number}`, to: '/admin/quotes' }
  if (acceptedQuote.value && !clientProjects.value.length) return { label: 'Créer le projet accepté', to: `/admin/projects?new=1&clientId=${client.value.id}` }
  if (clientProjects.value.length && !clientInvoices.value.length) return { label: 'Émettre la première facture', to: `/admin/invoices?new=1&clientId=${client.value.id}` }
  if (openInvoice.value?.status === 'overdue') return { label: `Relancer la facture ${openInvoice.value.number}`, to: '/admin/invoices' }
  if (openInvoice.value) return { label: `Suivre le règlement de ${openInvoice.value.number}`, to: '/admin/invoices' }
  return { label: 'Planifier le suivi client', to: `/admin/appointments?new=1&clientId=${client.value.id}` }
})
const nextDeadline = computed(() => {
  const values = [
    ...clientTasks.value.filter(task => task.status !== 'done' && task.dueDate).map(task => ({ date: task.dueDate!, label: task.title })),
    ...clientInvoices.value.filter(invoice => invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.dueAt).map(invoice => ({ date: invoice.dueAt!, label: `Facture ${invoice.number}` })),
    ...(nextAppointment.value ? [{ date: nextAppointment.value.startsAt.slice(0, 10), label: nextAppointment.value.title }] : []),
  ].sort((a, b) => a.date.localeCompare(b.date))
  return values[0] || null
})

const timeline = computed(() => {
  const auditEvents = auditLogs.value.map((log) => {
    const payload = log.payload || {}
    const title = payload.title || payload.name || payload.number || `${log.entity_type} ${log.entity_id || ''}`.trim()
    const status = payload.status ? ` (${payload.status})` : ''
    const meta = payload.amount_cents != null
      ? `${(Number(payload.amount_cents) / 100).toFixed(2)} CHF`
      : (payload.email || payload.priority || '')

    return {
      key: `audit-${log.id}`,
      title: `${log.action} · ${title}${status}`,
      meta,
      date: log.created_at?.slice(0, 19).replace('T', ' ') || '',
      sortDate: log.created_at || '',
    }
  })

  const messageEvents = relatedMessages.value.map(message => ({
    key: `message-${message.id}`,
    title: `message_contact · ${message.subject || 'Nouveau message'}`,
    meta: `${message.name} (${message.status})`,
    date: message.createdAt?.slice(0, 19).replace('T', ' ') || '',
    sortDate: message.createdAt || '',
  }))

  return [...messageEvents, ...auditEvents].sort((a, b) => b.sortDate.localeCompare(a.sortDate))
})

onMounted(async () => {
  await Promise.all([
    clientsStore.ensureLoaded(),
    tasksStore.ensureLoaded(),
    quotesStore.ensureLoaded(),
    invoicesStore.ensureLoaded(),
    appointmentsStore.ensureLoaded(),
    projectsStore.ensureLoaded(),
  ])

  auditLogs.value = await $fetch('/api/audit', {
    query: { clientId: clientId.value, limit: 80 },
    headers: auth.authHeader(),
  })

  if (client.value?.email) {
    relatedMessages.value = await $fetch('/api/messages', {
      query: { email: client.value.email },
      headers: auth.authHeader(),
    })
  }
})
</script>

<template>
  <div class="space-y-6 admin-main-safe">
    <div v-if="client" class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 min-w-0">
      <div class="min-w-0">
        <NuxtLink to="/admin/clients" class="text-xs text-gray-400 hover:text-gray-600">← Retour clients</NuxtLink>
        <h1 class="font-display font-semibold text-2xl text-gray-900 dark:text-white mt-1">{{ client.name }}</h1>
        <p class="text-sm text-gray-400 admin-text-wrap">{{ client.company || 'Indépendant' }} · {{ client.email }}</p>
      </div>
      <div class="grid grid-cols-1 sm:flex items-stretch sm:items-center gap-2 w-full sm:w-auto">
        <NuxtLink :to="`/admin/quotes?new=1&clientId=${client.id}`" class="px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold text-center">Nouveau devis</NuxtLink>
        <NuxtLink :to="`/admin/invoices?new=1&clientId=${client.id}`" class="px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold text-center">Nouvelle facture</NuxtLink>
        <NuxtLink :to="`/admin/appointments?new=1&clientId=${client.id}`" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold text-center">Nouveau RDV</NuxtLink>
      </div>
    </div>

    <div v-if="!client" class="rounded-xl border border-gray-200 dark:border-white/10 p-6 text-sm text-gray-500">
      Client introuvable.
    </div>

    <template v-else>
      <section class="rounded-xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-[#111118]">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Parcours client</p>
            <ol class="mt-3 grid grid-cols-5 gap-1.5" aria-label="Progression du client">
              <li v-for="(stage, index) in pipelineStages" :key="stage.label" class="min-w-0">
                <div class="h-1.5 rounded-full" :class="stage.done ? 'bg-violet-600' : index === pipelineIndex ? 'bg-cyan-400' : 'bg-gray-200 dark:bg-white/10'" />
                <p class="mt-1 truncate text-xs" :class="stage.done || index === pipelineIndex ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-400'">{{ stage.label }}</p>
              </li>
            </ol>
          </div>
          <div class="grid gap-2 sm:grid-cols-2 xl:w-[430px]">
            <div class="rounded-lg bg-violet-50 p-3 dark:bg-violet-500/10"><p class="text-xs text-violet-600 dark:text-violet-300">Prochaine action</p><NuxtLink v-if="nextAction" :to="nextAction.to" class="mt-1 block text-sm font-semibold text-gray-950 hover:text-violet-700 dark:text-white dark:hover:text-violet-300">{{ nextAction.label }} →</NuxtLink></div>
            <div class="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.04]"><p class="text-xs text-gray-400">Prochaine échéance</p><p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ nextDeadline ? nextDeadline.date : 'Aucune' }}</p><p v-if="nextDeadline" class="truncate text-xs text-gray-500">{{ nextDeadline.label }}</p></div>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs text-gray-400 uppercase">Devis</p>
          <p class="font-display font-bold text-xl mt-1">{{ clientQuotes.length }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ (totalQuotes / 100).toFixed(2) }} CHF</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs text-gray-400 uppercase">Factures</p>
          <p class="font-display font-bold text-xl mt-1">{{ clientInvoices.length }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ (totalInvoices / 100).toFixed(2) }} CHF</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs text-gray-400 uppercase">Impayées</p>
          <p class="font-display font-bold text-xl mt-1">{{ overdueInvoices.length }}</p>
          <p class="text-xs text-gray-500 mt-1">statut overdue</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs text-gray-400 uppercase">Prochain RDV</p>
          <p class="font-display font-bold text-sm mt-2 text-gray-800 dark:text-gray-100">
            {{ nextAppointment ? new Date(nextAppointment.startsAt).toLocaleString('fr-CH') : 'Aucun' }}
          </p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-4 min-w-0">
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Projets liés</h2>
          <div v-if="clientProjects.length" class="space-y-2">
            <div v-for="project in clientProjects.slice(0, 5)" :key="project.id" class="flex items-center justify-between gap-3 text-sm min-w-0">
              <span class="truncate">{{ project.title }}</span><span class="text-xs uppercase text-gray-400">{{ project.category }}</span>
            </div>
          </div>
          <NuxtLink v-else :to="`/admin/projects?new=1&clientId=${client.id}`" class="text-xs font-semibold text-violet-600">Créer le premier projet</NuxtLink>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Devis récents</h2>
          <div v-if="clientQuotes.length" class="space-y-2">
            <div v-for="q in clientQuotes.slice(0, 5)" :key="q.id" class="flex items-center justify-between gap-3 text-sm min-w-0">
              <span class="truncate">{{ q.number }} · {{ q.title }}</span>
              <span class="text-gray-400 whitespace-nowrap">{{ (q.amountCents / 100).toFixed(2) }} {{ q.currency }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Aucun devis</p>
        </div>

        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Factures récentes</h2>
          <div v-if="clientInvoices.length" class="space-y-2">
            <div v-for="i in clientInvoices.slice(0, 5)" :key="i.id" class="flex items-center justify-between gap-3 text-sm min-w-0">
              <span class="truncate">{{ i.number }} · {{ statusLabel(i.status) }}</span>
              <span class="text-gray-400 whitespace-nowrap">{{ (i.amountCents / 100).toFixed(2) }} {{ i.currency }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Aucune facture</p>
        </div>

        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Tâches</h2>
          <div v-if="clientTasks.length" class="space-y-2">
            <div v-for="t in clientTasks.slice(0, 6)" :key="t.id" class="flex items-center justify-between gap-3 text-sm min-w-0">
              <span class="truncate">{{ t.title }}</span>
              <span class="text-gray-400 whitespace-nowrap">{{ statusLabel(t.status) }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Aucune tâche</p>
        </div>

        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Rendez-vous</h2>
          <div v-if="clientAppointments.length" class="space-y-2">
            <div v-for="a in clientAppointments.slice(0, 6)" :key="a.id" class="flex items-center justify-between gap-3 text-sm min-w-0">
              <span class="truncate">{{ a.title }}</span>
              <span class="text-gray-400 whitespace-nowrap">{{ new Date(a.startsAt).toLocaleDateString('fr-CH') }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Aucun rendez-vous</p>
        </div>
      </div>

      <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4 min-w-0">
        <h2 class="text-sm font-semibold mb-3">Messages liés</h2>
        <div v-if="relatedMessages.length" class="space-y-2">
          <div v-for="message in relatedMessages.slice(0, 6)" :key="message.id" class="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-2 last:border-0">
            <div class="min-w-0">
              <p class="text-sm text-gray-800 dark:text-gray-100 truncate">{{ message.subject || 'Nouveau message' }}</p>
              <p class="text-xs text-gray-400 admin-text-wrap">{{ message.message }}</p>
            </div>
            <span class="text-xs text-gray-400 whitespace-nowrap">{{ message.createdAt?.slice(0, 10) }}</span>
          </div>
        </div>
        <p v-else class="text-xs text-gray-400">Aucun message lié pour cet email</p>
      </div>

      <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4 min-w-0">
        <h2 class="text-sm font-semibold mb-3">Timeline activité</h2>
        <div v-if="timeline.length" class="space-y-2">
          <div v-for="event in timeline.slice(0, 12)" :key="event.key" class="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-2 last:border-0">
            <div class="min-w-0">
              <p class="text-sm text-gray-800 dark:text-gray-100 truncate">{{ event.title }}</p>
              <p class="text-xs text-gray-400 admin-text-wrap">{{ event.meta }}</p>
            </div>
            <span class="text-xs text-gray-400 whitespace-nowrap">{{ event.date }}</span>
          </div>
        </div>
        <p v-else class="text-xs text-gray-400">Aucune activité pour ce client</p>
      </div>
    </template>
  </div>
</template>
