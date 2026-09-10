<script setup lang="ts">
import type { ContactMessage } from '~/types'
import { CLIENT_WORKFLOW_STAGES, resolveClientWorkflow } from '~/utils/clientWorkflow'
import AdminViewSkeleton from '~/components/admin/AdminViewSkeleton.vue'

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
const formatDate = (value: string | null | undefined, withTime = false) => value
  ? new Intl.DateTimeFormat('fr-CH', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value))
  : 'Non définie'

const auditLogs = ref<Array<{ id: number, action: string, entity_type: string, entity_id: string | null, payload: any, created_at: string }>>([])
const relatedMessages = ref<ContactMessage[]>([])
const loading = ref(true)
const loadError = ref('')

const client = computed(() => clientsStore.clients.find(c => c.id === clientId.value) || null)
const clientTasks = computed(() => tasksStore.tasks.filter(t => t.clientId === clientId.value))
const clientQuotes = computed(() => quotesStore.quotes.filter(q => q.clientId === clientId.value))
const clientInvoices = computed(() => invoicesStore.invoices.filter(i => i.clientId === clientId.value))
const clientAppointments = computed(() => appointmentsStore.appointments.filter(a => a.clientId === clientId.value))
const clientProjects = computed(() => projectsStore.projects.filter(project => project.clientId === clientId.value))

const totalQuotes = computed(() => clientQuotes.value.reduce((sum, q) => sum + q.amountCents, 0))
const totalInvoices = computed(() => clientInvoices.value.reduce((sum, i) => sum + (i.documentType === 'credit_note' ? -1 : 1) * i.amountCents, 0))
const overdueInvoices = computed(() => clientInvoices.value.filter(i => i.documentType === 'invoice' && i.status === 'overdue'))
const nextAppointment = computed(() => {
  const now = new Date().toISOString()
  return clientAppointments.value
    .filter(a => a.startsAt >= now && a.status === 'scheduled')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] || null
})
const clientWorkflow = computed(() => client.value
  ? resolveClientWorkflow({ client: client.value, projects: clientProjects.value, quotes: clientQuotes.value, invoices: clientInvoices.value, tasks: clientTasks.value })
  : null)
const pipelineIndex = computed(() => clientWorkflow.value?.stageIndex ?? 0)
const pipelineStages = computed(() => CLIENT_WORKFLOW_STAGES.map((stage, index) => ({ ...stage, done: index < pipelineIndex.value })))
const nextAction = computed(() => clientWorkflow.value ? { label: clientWorkflow.value.action, to: clientWorkflow.value.to } : null)
const nextDeadline = computed(() => {
  const values = [
    ...clientTasks.value.filter(task => task.status !== 'done' && task.dueDate).map(task => ({ date: task.dueDate!, label: task.title })),
    ...clientInvoices.value.filter(invoice => invoice.documentType === 'invoice' && invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.dueAt).map(invoice => ({ date: invoice.dueAt!, label: `Facture ${invoice.number}` })),
    ...(nextAppointment.value ? [{ date: nextAppointment.value.startsAt.slice(0, 10), label: nextAppointment.value.title }] : []),
  ].sort((a, b) => a.date.localeCompare(b.date))
  return values[0] || null
})

const timeline = computed(() => {
  const actionLabels: Record<string, string> = {
    create: 'Création',
    update: 'Mise à jour',
    delete: 'Suppression',
    sent: 'Envoi',
    payment_created: 'Paiement enregistré',
    payment_voided: 'Paiement annulé',
  }
  const entityLabels: Record<string, string> = { client: 'Client', project: 'Projet', quote: 'Devis', invoice: 'Facture', task: 'Tâche' }
  const auditEvents = auditLogs.value.map((log) => {
    const payload = log.payload || {}
    const title = payload.title || payload.name || payload.number || `${log.entity_type} ${log.entity_id || ''}`.trim()
    const status = payload.status ? ` · ${statusLabel(payload.status)}` : ''
    const meta = payload.amount_cents != null
      ? `${(Number(payload.amount_cents) / 100).toFixed(2)} CHF`
      : (payload.email || payload.priority || '')

    return {
      key: `audit-${log.id}`,
      title: `${actionLabels[log.action] || 'Activité'} · ${entityLabels[log.entity_type] || 'Dossier'} ${title}${status}`,
      meta,
      date: log.created_at?.slice(0, 19).replace('T', ' ') || '',
      sortDate: log.created_at || '',
    }
  })

  const messageEvents = relatedMessages.value.map(message => ({
    key: `message-${message.id}`,
    title: `Message reçu · ${message.subject || 'Nouveau message'}`,
    meta: `${message.name} · ${statusLabel(message.status)}`,
    date: message.createdAt?.slice(0, 19).replace('T', ' ') || '',
    sortDate: message.createdAt || '',
  }))

  return [...messageEvents, ...auditEvents].sort((a, b) => b.sortDate.localeCompare(a.sortDate))
})

onMounted(async () => {
  try {
    await Promise.all([
      clientsStore.ensureLoaded(), tasksStore.ensureLoaded(), quotesStore.ensureLoaded(), invoicesStore.ensureLoaded(), appointmentsStore.ensureLoaded(), projectsStore.ensureLoaded(),
    ])
    auditLogs.value = await $fetch('/api/audit', { query: { clientId: clientId.value, limit: 80 }, headers: auth.authHeader() })
    if (client.value?.email) relatedMessages.value = await $fetch('/api/messages', { query: { email: client.value.email }, headers: auth.authHeader() })
  } catch {
    loadError.value = 'La fiche client ne peut pas être chargée. Vérifie ta connexion, puis réessaie.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6 admin-main-safe">
    <AdminViewSkeleton v-if="loading" variant="detail" label="Chargement de la fiche client" />
    <div v-else-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100"><p class="font-semibold">Fiche indisponible</p><p class="mt-1 text-sm">{{ loadError }}</p><NuxtLink to="/admin/clients" class="mt-4 inline-flex min-h-11 items-center rounded-lg bg-red-700 px-4 text-sm font-semibold text-white">Retour aux clients</NuxtLink></div>
    <div v-else-if="client" class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 min-w-0">
      <div class="min-w-0">
        <NuxtLink to="/admin/clients" class="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">← Retour clients</NuxtLink>
        <h1 class="font-display font-semibold text-2xl text-gray-900 dark:text-white mt-1">{{ client.name }}</h1>
        <p class="admin-text-wrap text-sm text-gray-600 dark:text-gray-300">{{ client.company || 'Indépendant' }} · {{ client.email }}</p>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span class="rounded-full bg-cyan-50 px-2.5 py-1 font-semibold text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-200">{{ client.acquisitionSource || 'Source non attribuée' }}</span>
          <span v-if="client.acquisitionMedium" class="text-gray-500 dark:text-gray-400">{{ client.acquisitionMedium }}</span>
          <span v-if="client.acquisitionCampaign" class="text-gray-600 dark:text-gray-300">· {{ client.acquisitionCampaign }}</span>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:flex items-stretch sm:items-center gap-2 w-full sm:w-auto">
        <NuxtLink :to="`/admin/quotes?new=1&clientId=${client.id}`" class="px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold text-center">Nouveau devis</NuxtLink>
        <NuxtLink :to="`/admin/tasks?new=1&clientId=${client.id}`" class="inline-flex min-h-11 items-center justify-center rounded-lg border border-violet-200 px-3 py-2 text-center text-xs font-semibold text-violet-700 dark:border-violet-500/30 dark:text-violet-200">Nouvelle tâche</NuxtLink>
        <NuxtLink :to="`/admin/invoices?new=1&clientId=${client.id}`" class="inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-700 px-3 py-2 text-center text-xs font-semibold text-white">Nouvelle facture</NuxtLink>
        <NuxtLink :to="`/admin/appointments?new=1&clientId=${client.id}`" class="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-center text-xs font-semibold text-white">Nouveau RDV</NuxtLink>
      </div>
    </div>

    <div v-if="!loading && !loadError && !client" class="rounded-xl border border-gray-200 dark:border-white/10 p-6 text-sm text-gray-500">
      Client introuvable.
    </div>

    <template v-if="!loading && !loadError && client">
      <section class="rounded-xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-[#111118]">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Parcours client</p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Progression calculée depuis les devis, projets, factures et paiements liés.</p>
            <ol class="mt-3 grid grid-cols-5 gap-1.5" aria-label="Progression du client">
              <li v-for="(stage, index) in pipelineStages" :key="stage.label" class="min-w-0">
                <div class="h-1.5 rounded-full" :class="stage.done ? 'bg-violet-600' : index === pipelineIndex ? 'bg-cyan-400' : 'bg-gray-200 dark:bg-white/10'" />
                <p class="mt-1 truncate text-xs" :class="stage.done || index === pipelineIndex ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'">{{ stage.label }}</p>
              </li>
            </ol>
          </div>
          <div class="grid gap-2 sm:grid-cols-2 xl:w-[430px]">
            <div class="rounded-lg bg-violet-50 p-3 dark:bg-violet-500/10"><p class="text-xs text-violet-600 dark:text-violet-300">Prochaine action</p><NuxtLink v-if="nextAction" :to="nextAction.to" class="mt-1 block text-sm font-semibold text-violet-950 hover:text-violet-700 dark:text-violet-100 dark:hover:text-violet-300">{{ nextAction.label }} →</NuxtLink></div>
            <div class="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.04]"><p class="text-xs text-gray-600 dark:text-gray-300">Prochaine échéance</p><p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{{ nextDeadline ? formatDate(nextDeadline.date) : 'Aucune' }}</p><p v-if="nextDeadline" class="truncate text-xs text-gray-500">{{ nextDeadline.label }}</p></div>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs uppercase text-gray-600 dark:text-gray-300">Devis</p>
          <p class="font-display font-bold text-xl mt-1">{{ clientQuotes.length }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ (totalQuotes / 100).toFixed(2) }} CHF</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs uppercase text-gray-600 dark:text-gray-300">Factures</p>
          <p class="font-display font-bold text-xl mt-1">{{ clientInvoices.length }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ (totalInvoices / 100).toFixed(2) }} CHF</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs uppercase text-gray-600 dark:text-gray-300">Impayées</p>
          <p class="font-display font-bold text-xl mt-1">{{ overdueInvoices.length }}</p>
          <p class="text-xs text-gray-500 mt-1">statut overdue</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs uppercase text-gray-600 dark:text-gray-300">Prochain RDV</p>
          <p class="font-display font-bold text-sm mt-2 text-gray-800 dark:text-gray-100">
            {{ nextAppointment ? formatDate(nextAppointment.startsAt, true) : 'Aucun' }}
          </p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-4 min-w-0">
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Projets liés</h2>
          <div v-if="clientProjects.length" class="space-y-2">
            <NuxtLink v-for="project in clientProjects.slice(0, 5)" :key="project.id" :to="`/admin/projects/${project.id}`" class="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 text-sm transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-violet-500/10"><span class="truncate font-medium">{{ project.title }}</span><span class="text-xs uppercase text-gray-600 dark:text-gray-300">{{ project.category }}</span></NuxtLink>
          </div>
          <NuxtLink v-else :to="`/admin/projects?new=1&clientId=${client.id}`" class="text-xs font-semibold text-violet-600">Créer le premier projet</NuxtLink>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Devis récents</h2>
          <div v-if="clientQuotes.length" class="space-y-2">
            <NuxtLink v-for="q in clientQuotes.slice(0, 5)" :key="q.id" :to="`/admin/quotes?quoteId=${q.id}&clientId=${client.id}`" class="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 text-sm transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-violet-500/10">
              <span class="truncate">{{ q.number }} · {{ q.title }}</span>
              <span class="whitespace-nowrap text-gray-600 dark:text-gray-300">{{ (q.amountCents / 100).toFixed(2) }} {{ q.currency }}</span>
            </NuxtLink>
          </div>
          <p v-else class="text-xs text-gray-600 dark:text-gray-300">Aucun devis</p>
        </div>

        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Factures récentes</h2>
          <div v-if="clientInvoices.length" class="space-y-2">
            <NuxtLink v-for="i in clientInvoices.slice(0, 5)" :key="i.id" :to="`/admin/invoices?invoiceId=${i.id}&clientId=${client.id}`" class="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 text-sm transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-violet-500/10">
              <span class="truncate">{{ i.number }} · {{ statusLabel(i.status) }}</span>
              <span class="whitespace-nowrap text-gray-600 dark:text-gray-300">{{ (i.amountCents / 100).toFixed(2) }} {{ i.currency }}</span>
            </NuxtLink>
          </div>
          <p v-else class="text-xs text-gray-600 dark:text-gray-300">Aucune facture</p>
        </div>

        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Tâches</h2>
          <div v-if="clientTasks.length" class="space-y-2">
            <NuxtLink v-for="t in clientTasks.slice(0, 6)" :key="t.id" :to="`/admin/tasks?taskId=${t.id}&clientId=${client.id}`" class="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 text-sm transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-violet-500/10">
              <span class="truncate">{{ t.title }}</span>
              <span class="whitespace-nowrap text-gray-600 dark:text-gray-300">{{ statusLabel(t.status) }}</span>
            </NuxtLink>
          </div>
          <p v-else class="text-xs text-gray-600 dark:text-gray-300">Aucune tâche</p>
        </div>

        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Rendez-vous</h2>
          <div v-if="clientAppointments.length" class="space-y-2">
            <div v-for="a in clientAppointments.slice(0, 6)" :key="a.id" class="flex items-center justify-between gap-3 text-sm min-w-0">
              <span class="truncate">{{ a.title }}</span>
              <span class="whitespace-nowrap text-gray-600 dark:text-gray-300">{{ formatDate(a.startsAt) }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-600 dark:text-gray-300">Aucun rendez-vous</p>
        </div>
      </div>

      <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4 min-w-0">
        <h2 class="text-sm font-semibold mb-3">Messages liés</h2>
        <div v-if="relatedMessages.length" class="space-y-2">
          <div v-for="message in relatedMessages.slice(0, 6)" :key="message.id" class="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-2 last:border-0">
            <div class="min-w-0">
              <p class="text-sm text-gray-800 dark:text-gray-100 truncate">{{ message.subject || 'Nouveau message' }}</p>
              <p class="admin-text-wrap text-xs text-gray-600 dark:text-gray-300">{{ message.message }}</p>
            </div>
            <span class="whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">{{ formatDate(message.createdAt) }}</span>
          </div>
        </div>
        <p v-else class="text-xs text-gray-600 dark:text-gray-300">Aucun message lié pour cet email</p>
      </div>

      <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4 min-w-0">
        <h2 class="text-sm font-semibold mb-3">Timeline activité</h2>
        <div v-if="timeline.length" class="space-y-2">
          <div v-for="event in timeline.slice(0, 12)" :key="event.key" class="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-2 last:border-0">
            <div class="min-w-0">
              <p class="text-sm text-gray-800 dark:text-gray-100 truncate">{{ event.title }}</p>
              <p class="admin-text-wrap text-xs text-gray-600 dark:text-gray-300">{{ event.meta }}</p>
            </div>
            <span class="whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">{{ formatDate(event.sortDate, true) }}</span>
          </div>
        </div>
        <p v-else class="text-xs text-gray-600 dark:text-gray-300">Aucune activité pour ce client</p>
      </div>
    </template>
  </div>
</template>
