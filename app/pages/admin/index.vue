<script setup lang="ts">
import type { ContactMessage } from '~/types'
import AdminAdminIcon from '~/components/admin/AdminIcon.vue'
import AdminAdminEmptyState from '~/components/admin/AdminEmptyState.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const projects = useProjectsStore()
const articles = useArticlesStore()
const reviews = useReviewsStore()
const clients = useClientsStore()
const tasks = useTasksStore()
const quotes = useQuotesStore()
const invoices = useInvoicesStore()
const appointments = useAppointmentsStore()
const auth = useAuthStore()
const toast = useToast()

const messages = ref<ContactMessage[]>([])
const runningAutomation = ref(false)
const runningEmailReminders = ref(false)
const reminderRuns = ref<Array<{ id: number, action: string, payload: Record<string, any>, created_at: string }>>([])
const reminderPreview = ref<{
  automationEnabled: boolean
  generatedAt: string
  candidates: Array<{ reminderKey: string, targetType: 'quote' | 'invoice', targetId: number, clientId: number, clientName: string, number: string, dueDate: string, milestone: string, urgency: 'upcoming' | 'due' | 'overdue', balanceCents?: number, currency?: string }>
  skipped: { alreadySent: number, missingContact: number, outsideMilestone: number, paused: number }
} | null>(null)
const reminderPreviewStatus = ref<'loading' | 'ready' | 'error'>('loading')

const todayIso = computed(() => new Date().toISOString().slice(0, 10))
const nowIso = computed(() => new Date().toISOString())
const todayLabel = computed(() => new Date().toLocaleDateString('fr-CH', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
}))

const openTasks = computed(() =>
  tasks.tasks
    .filter(task => task.status !== 'done')
    .sort((a, b) => String(a.dueDate || '9999-12-31').localeCompare(String(b.dueDate || '9999-12-31'))),
)

const dueTasks = computed(() => openTasks.value.filter(task => task.dueDate && task.dueDate <= todayIso.value))

const overdueInvoices = computed(() =>
  invoices.invoices
    .filter(invoice => invoice.status === 'overdue')
    .sort((a, b) => String(a.dueAt || '').localeCompare(String(b.dueAt || ''))),
)

const pendingQuotes = computed(() =>
  quotes.quotes
    .filter(quote => quote.status === 'sent')
    .sort((a, b) => String(a.validUntil || '').localeCompare(String(b.validUntil || ''))),
)

const nextAppointments = computed(() =>
  appointments.appointments
    .filter(appointment => appointment.status === 'scheduled' && appointment.startsAt >= nowIso.value)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 5),
)

const newMessages = computed(() =>
  messages.value
    .filter(message => message.status === 'new')
    .slice(0, 6),
)

const monthRevenue = computed(() => {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  return invoices.invoices
    .filter(invoice => invoice.status === 'paid' && invoice.paidAt && invoice.paidAt >= monthStart)
    .reduce((sum, invoice) => sum + (invoice.documentType === 'credit_note' ? -1 : 1) * (invoice.totalCents ?? invoice.amountCents), 0)
})

const expectedRevenue = computed(() => {
  const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return invoices.invoices
    .filter(invoice => invoice.documentType === 'invoice' && ['sent', 'overdue'].includes(invoice.status) && invoice.dueAt && invoice.dueAt <= next30)
    .reduce((sum, invoice) => sum + (invoice.totalCents ?? invoice.amountCents), 0)
})

const quoteValue = computed(() =>
  pendingQuotes.value.reduce((sum, quote) => sum + (quote.totalCents ?? quote.amountCents), 0),
)

const metrics = computed(() => [
  {
    label: 'A encaisser',
    value: money(expectedRevenue.value),
    meta: `${overdueInvoices.value.length} retard(s)`,
    icon: 'receipt',
    to: '/admin/invoices',
    tone: 'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10',
    bar: 'bg-rose-500',
  },
  {
    label: 'Pipeline devis',
    value: money(quoteValue.value),
    meta: `${pendingQuotes.value.length} devis envoyes`,
    icon: 'file-plus',
    to: '/admin/quotes',
    tone: 'text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10',
    bar: 'bg-sky-500',
  },
  {
    label: 'Actions dues',
    value: dueTasks.value.length,
    meta: `${openTasks.value.length} taches ouvertes`,
    icon: 'check-square',
    to: '/admin/tasks',
    tone: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10',
    bar: 'bg-amber-500',
  },
  {
    label: 'Leads neufs',
    value: newMessages.value.length,
    meta: `${clients.clients.filter(client => client.status === 'lead').length} leads CRM`,
    icon: 'users',
    to: '/admin/crm',
    tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10',
    bar: 'bg-emerald-500',
  },
])

const priorities = computed(() => {
  const items: Array<{
    id: string
    title: string
    meta: string
    to: string
    icon: string
    label: string
    tone: string
    chip: string
  }> = []

  if (overdueInvoices.value.length) {
    items.push({
      id: 'overdue',
      title: 'Relancer les factures en retard',
      meta: `${overdueInvoices.value.length} facture(s), ${money(overdueInvoices.value.reduce((sum, invoice) => sum + (invoice.totalCents ?? invoice.amountCents), 0))}`,
      to: '/admin/invoices?status=overdue',
      icon: 'receipt',
      label: 'Urgent',
      tone: 'border-l-rose-500',
      chip: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    })
  }

  if (newMessages.value.length) {
    items.push({
      id: 'messages',
      title: 'Qualifier les nouveaux messages',
      meta: `${newMessages.value.length} lead(s) entrants depuis la vitrine`,
      to: '/admin/messages',
      icon: 'mail',
      label: 'Lead',
      tone: 'border-l-emerald-500',
      chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    })
  }

  if (dueTasks.value.length) {
    items.push({
      id: 'tasks',
      title: 'Terminer les taches dues',
      meta: `${dueTasks.value.length} echeance(s) aujourd'hui ou en retard`,
      to: '/admin/tasks',
      icon: 'check-square',
      label: 'Delivery',
      tone: 'border-l-amber-500',
      chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    })
  }

  if (pendingQuotes.value.length) {
    items.push({
      id: 'quotes',
      title: 'Suivre les devis envoyes',
      meta: `${pendingQuotes.value.length} devis ouverts, ${money(quoteValue.value)} en attente`,
      to: '/admin/quotes?status=sent',
      icon: 'file-plus',
      label: 'Sales',
      tone: 'border-l-sky-500',
      chip: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    })
  }

  if (nextAppointments.value.length) {
    items.push({
      id: 'appointments',
      title: 'Preparer les prochains rendez-vous',
      meta: `${nextAppointments.value.length} rendez-vous programme(s)`,
      to: '/admin/appointments',
      icon: 'calendar',
      label: 'Agenda',
      tone: 'border-l-violet-500',
      chip: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
    })
  }

  return items
})

const commercialRows = computed(() => {
  const rows: Array<{
    id: string
    type: string
    title: string
    meta: string
    value: string
    to: string
    tone: string
  }> = []

  for (const message of newMessages.value) {
    rows.push({
      id: `message-${message.id}`,
      type: 'Lead',
      title: message.name,
      meta: message.subject || message.email,
      value: 'Nouveau',
      to: '/admin/messages',
      tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10',
    })
  }

  for (const invoice of overdueInvoices.value.slice(0, 4)) {
    rows.push({
      id: `invoice-${invoice.id}`,
      type: 'Facture',
      title: invoice.number,
      meta: clientName(invoice.clientId),
      value: money(invoice.totalCents ?? invoice.amountCents),
      to: '/admin/invoices',
      tone: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10',
    })
  }

  for (const quote of pendingQuotes.value.slice(0, 4)) {
    rows.push({
      id: `quote-${quote.id}`,
      type: 'Devis',
      title: quote.number,
      meta: clientName(quote.clientId),
      value: money(quote.totalCents ?? quote.amountCents),
      to: '/admin/quotes',
      tone: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10',
    })
  }

  return rows.slice(0, 8)
})

const productionRows = computed(() =>
  openTasks.value.slice(0, 5).map(task => ({
    id: task.id,
    title: task.title,
    meta: task.dueDate ? `Echeance ${task.dueDate}` : 'Sans echeance',
    status: task.priority,
  })),
)

const recentProjects = computed(() => projects.projects.slice(0, 3))
const recentArticles = computed(() => articles.articles.slice(0, 3))

function money(cents: number) {
  return `${(cents / 100).toFixed(0)} CHF`
}

function reminderMoney(cents = 0, currency = 'CHF') {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency }).format(cents / 100)
}

function daysFromNow(isoDate: string) {
  const now = new Date()
  const date = new Date(isoDate)
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function clientName(clientId: number | null) {
  if (!clientId) return 'Sans client'
  return clients.clients.find(client => client.id === clientId)?.name || `Client #${clientId}`
}

async function loadReminderRuns() {
  try {
    reminderRuns.value = await $fetch('/api/admin/pipeline/runs', {
      headers: auth.authHeader(),
    })
  } catch {
    reminderRuns.value = []
  }
}

async function loadReminderPreview() {
  reminderPreviewStatus.value = 'loading'
  try {
    reminderPreview.value = await $fetch('/api/admin/pipeline/reminders', { headers: auth.authHeader() })
    reminderPreviewStatus.value = 'ready'
  }
  catch {
    reminderPreview.value = null
    reminderPreviewStatus.value = 'error'
  }
}

async function loadMessages() {
  try {
    messages.value = await $fetch('/api/messages', {
      headers: auth.authHeader(),
    })
  } catch {
    messages.value = []
  }
}

async function runPipelineAutomation() {
  if (runningAutomation.value) return
  runningAutomation.value = true

  try {
    await Promise.all([tasks.ensureLoaded(), quotes.ensureLoaded(), invoices.ensureLoaded(), clients.ensureLoaded()])
    const existingTitles = new Set(tasks.tasks.map(task => task.title))
    let created = 0

    for (const quote of quotes.quotes) {
      if (quote.status !== 'sent' || !quote.validUntil) continue
      const days = daysFromNow(quote.validUntil)
      if (days < 0 || days > 3) continue
      const title = `[RELANCE DEVIS ${quote.number}]`
      if (existingTitles.has(title)) continue

      await tasks.add({
        title,
        description: `Relancer le devis ${quote.number} (${quote.title}) avant expiration (${quote.validUntil}).`,
        status: 'todo',
        priority: days <= 1 ? 'high' : 'medium',
        dueDate: quote.validUntil,
        clientId: quote.clientId ?? null,
        projectId: null,
      })

      existingTitles.add(title)
      created++
    }

    for (const invoice of invoices.invoices) {
      if (!['sent', 'overdue'].includes(invoice.status) || !invoice.dueAt) continue
      const days = daysFromNow(invoice.dueAt)
      if (days > 2) continue
      const title = `[RELANCE FACTURE ${invoice.number}]`
      if (existingTitles.has(title)) continue

      await tasks.add({
        title,
        description: `Relancer la facture ${invoice.number} (echeance ${invoice.dueAt}).`,
        status: 'todo',
        priority: days < 0 ? 'high' : 'medium',
        dueDate: invoice.dueAt,
        clientId: invoice.clientId ?? null,
        projectId: null,
      })

      existingTitles.add(title)
      created++
    }

    toast.success(created > 0 ? `${created} relance(s) ajoutee(s)` : 'Aucune nouvelle relance a generer')
  } catch {
    toast.error('Erreur pendant la generation des relances')
  } finally {
    runningAutomation.value = false
  }
}

async function sendReminderEmails() {
  if (runningEmailReminders.value) return
  runningEmailReminders.value = true

  try {
    const result = await $fetch<{ sentCount: number, skippedCount: number, failedCount: number, overdueMarkedCount: number }>('/api/admin/pipeline/reminders', {
      method: 'POST',
      headers: auth.authHeader(),
    })

    toast.success(`Emails: ${result.sentCount} envoyé(s), ${result.skippedCount} ignoré(s), ${result.failedCount} échec(s) · ${result.overdueMarkedCount} facture(s) passée(s) en retard`)
    await Promise.all([loadReminderRuns(), loadReminderPreview()])
  } catch {
    toast.error('Erreur envoi relances email')
  } finally {
    runningEmailReminders.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    projects.ensureLoaded(),
    articles.ensureLoaded(),
    reviews.ensureLoaded(),
    clients.ensureLoaded(),
    tasks.ensureLoaded(),
    quotes.ensureLoaded(),
    invoices.ensureLoaded(),
    appointments.ensureLoaded(),
    loadReminderRuns(),
    loadReminderPreview(),
    loadMessages(),
  ])
})

watch(() => auth.currentOrganizationId, async (organizationId, previousOrganizationId) => {
  if (!organizationId || organizationId === previousOrganizationId) return
  await Promise.all([loadReminderRuns(), loadReminderPreview()])
})
</script>

<template>
  <div class="space-y-4 lg:space-y-5">
    <section class="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-20 right-[6%] h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
              Admin
            </span>
            <span class="text-xs text-gray-400 capitalize">{{ todayLabel }}</span>
          </div>
          <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">
            Tableau de bord
          </h1>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Priorites, pipeline et prochaines actions. Une seule vue pour savoir quoi traiter maintenant.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <NuxtLink to="/admin/messages" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]">
            <AdminAdminIcon icon="mail" class="h-4 w-4" />
            Inbox
          </NuxtLink>
          <NuxtLink to="/admin/tasks" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]">
            <AdminAdminIcon icon="check-square" class="h-4 w-4" />
            Taches
          </NuxtLink>
          <NuxtLink to="/admin/quotes?new=1" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 text-xs font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950">
            <AdminAdminIcon icon="file-plus" class="h-4 w-4" />
            Devis
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
      <NuxtLink
        v-for="metric in metrics"
        :key="metric.label"
        :to="metric.to"
        class="group relative min-h-[112px] overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-white/[0.08] dark:bg-[#111118] dark:hover:border-white/[0.16] sm:p-4"
      >
        <span class="absolute inset-x-0 top-0 h-1" :class="metric.bar" />
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-xs font-medium text-gray-500 dark:text-gray-400">{{ metric.label }}</p>
            <p class="mt-2 truncate text-xl font-semibold text-gray-950 dark:text-white sm:text-2xl">{{ metric.value }}</p>
          </div>
          <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="metric.tone">
            <AdminAdminIcon :icon="metric.icon" class="h-4 w-4" />
          </span>
        </div>
        <p class="mt-3 truncate text-xs text-gray-400">{{ metric.meta }}</p>
      </NuxtLink>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
      <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-gray-950 dark:text-white">Priorites</h2>
            <p class="mt-0.5 text-xs text-gray-400">A traiter dans l'ordre.</p>
          </div>
          <NuxtLink to="/admin/tasks" class="shrink-0 text-xs font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white">
            Tout voir
          </NuxtLink>
        </div>

        <div v-if="priorities.length" class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <NuxtLink
            v-for="item in priorities"
            :key="item.id"
            :to="item.to"
            class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-white/[0.03] sm:px-5"
          >
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg" :class="item.chip">
              <AdminAdminIcon :icon="item.icon" class="h-4 w-4" />
            </span>
            <div class="min-w-0">
              <div class="flex min-w-0 items-center gap-2">
                <p class="truncate text-sm font-semibold text-gray-950 dark:text-white">{{ item.title }}</p>
                <span class="hidden rounded-md px-2 py-0.5 text-xs font-semibold sm:inline-flex" :class="item.chip">
                  {{ item.label }}
                </span>
              </div>
              <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{{ item.meta }}</p>
            </div>
            <span class="text-lg leading-none text-gray-300 transition group-hover:text-gray-500 dark:text-gray-600">›</span>
          </NuxtLink>
        </div>

        <AdminAdminEmptyState v-else title="Aucune priorite critique" body="Le cockpit est propre pour l'instant." />
      </div>

      <aside class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
          <div>
            <h2 class="text-sm font-semibold text-gray-950 dark:text-white">Aujourd'hui</h2>
            <p class="mt-0.5 text-xs text-gray-400">Agenda proche.</p>
          </div>
          <NuxtLink to="/admin/appointments" class="text-xs font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white">
            Agenda
          </NuxtLink>
        </div>

        <div v-if="nextAppointments.length" class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <NuxtLink
            v-for="appointment in nextAppointments"
            :key="appointment.id"
            to="/admin/appointments"
            class="block px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-white/[0.03]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-gray-950 dark:text-white">{{ appointment.title }}</p>
                <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{{ clientName(appointment.clientId) }}</p>
              </div>
              <p class="shrink-0 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{{ formatDateTime(appointment.startsAt) }}</p>
            </div>
          </NuxtLink>
        </div>

        <AdminAdminEmptyState v-else title="Agenda libre" body="Aucun rendez-vous programme." />
      </aside>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-gray-950 dark:text-white">Pipeline commercial</h2>
            <p class="mt-0.5 text-xs text-gray-400">{{ money(monthRevenue) }} encaisses ce mois-ci.</p>
          </div>
          <NuxtLink to="/admin/clients" class="shrink-0 text-xs font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white">
            CRM
          </NuxtLink>
        </div>

        <div v-if="commercialRows.length" class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <NuxtLink
            v-for="row in commercialRows"
            :key="row.id"
            :to="row.to"
            class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-white/[0.03] sm:px-5"
          >
            <span class="rounded-md px-2 py-1 text-xs font-semibold" :class="row.tone">{{ row.type }}</span>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-gray-950 dark:text-white">{{ row.title }}</p>
              <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{{ row.meta }}</p>
            </div>
            <p class="shrink-0 text-right text-xs font-semibold text-gray-700 dark:text-gray-200">{{ row.value }}</p>
          </NuxtLink>
        </div>

        <AdminAdminEmptyState v-else title="Pipeline calme" body="Aucun lead, devis ou impaye critique." />
      </div>

      <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-gray-950 dark:text-white">Execution</h2>
            <p class="mt-0.5 text-xs text-gray-400">Taches, projets et contenu.</p>
          </div>
          <NuxtLink to="/admin/projects" class="shrink-0 text-xs font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white">
            Projets
          </NuxtLink>
        </div>

        <div class="grid gap-0 divide-y divide-gray-100 dark:divide-white/[0.06]">
          <div v-if="productionRows.length" class="px-4 py-3 sm:px-5">
            <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Taches ouvertes</p>
            <div class="space-y-2">
              <NuxtLink
                v-for="task in productionRows"
                :key="task.id"
                to="/admin/tasks"
                class="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 transition hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-gray-950 dark:text-white">{{ task.title }}</p>
                  <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ task.meta }}</p>
                </div>
                <span class="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200 dark:bg-white/[0.04] dark:text-gray-300 dark:ring-white/[0.08]">
                  {{ task.status }}
                </span>
              </NuxtLink>
            </div>
          </div>

          <div class="grid gap-0 divide-y divide-gray-100 dark:divide-white/[0.06] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div class="px-4 py-3 sm:px-5">
              <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Projets recents</p>
              <div class="space-y-2">
                <NuxtLink
                  v-for="project in recentProjects"
                  :key="project.id"
                  to="/admin/projects"
                  class="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2 transition hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                >
                  <div class="h-9 w-9 shrink-0 overflow-hidden rounded-md">
                    <img v-if="project.image" :src="project.image" class="h-full w-full object-cover" alt="">
                    <div v-else class="flex h-full w-full items-center justify-center bg-violet-100 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400">
                      <AdminAdminIcon icon="folder" class="h-4 w-4" />
                    </div>
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-gray-950 dark:text-white">{{ project.title }}</p>
                    <span
                      class="mt-0.5 inline-flex rounded px-1.5 py-0.5 text-xs font-semibold"
                      :class="{
                        web: 'bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
                        mobile: 'bg-pink-100 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400',
                        cms: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
                      }[project.category]"
                    >{{ project.category }}</span>
                  </div>
                </NuxtLink>
                <p v-if="!recentProjects.length" class="text-xs text-gray-400">Aucun projet.</p>
              </div>
            </div>

            <div class="px-4 py-3 sm:px-5">
              <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Articles recents</p>
              <div class="space-y-2">
                <NuxtLink
                  v-for="article in recentArticles"
                  :key="article.id"
                  to="/admin/articles"
                  class="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2 transition hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                >
                  <div class="h-9 w-9 shrink-0 overflow-hidden rounded-md">
                    <img v-if="article.coverImage" :src="article.coverImage" class="h-full w-full object-cover" alt="">
                    <div v-else class="flex h-full w-full items-center justify-center bg-fuchsia-100 text-fuchsia-500 dark:bg-fuchsia-500/10 dark:text-fuchsia-400">
                      <AdminAdminIcon icon="file-text" class="h-4 w-4" />
                    </div>
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-gray-950 dark:text-white">{{ article.title }}</p>
                    <span v-if="article.published" class="mt-0.5 inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">publie</span>
                    <span v-else class="mt-0.5 inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">brouillon</span>
                  </div>
                </NuxtLink>
                <p v-if="!recentArticles.length" class="text-xs text-gray-400">Aucun article.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-gray-950 dark:text-white">Automatisation</h2>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <p class="text-xs text-gray-500 dark:text-gray-400">Relances devis/factures selon des jalons anti-spam.</p>
            <span v-if="reminderPreviewStatus === 'ready' && reminderPreview" class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="reminderPreview.automationEnabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'">
              {{ reminderPreview.automationEnabled ? 'Automatique actif' : 'Mode manuel' }}
            </span>
            <span v-else-if="reminderPreviewStatus === 'error'" class="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">Indisponible</span>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-2 sm:flex">
          <button
            class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]"
            :disabled="runningAutomation"
            @click="runPipelineAutomation"
          >
            <AdminAdminIcon icon="zap" class="h-4 w-4" />
            {{ runningAutomation ? 'Génération…' : 'Créer les tâches' }}
          </button>
          <button
            class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-gray-950"
            :disabled="runningEmailReminders || reminderPreviewStatus !== 'ready' || !reminderPreview?.candidates.length"
            @click="sendReminderEmails"
          >
            <AdminAdminIcon icon="mail" class="h-4 w-4" />
            {{ runningEmailReminders ? 'Envoi…' : `Envoyer ${reminderPreview?.candidates.length || 0} rappel(s)` }}
          </button>
        </div>
      </div>

      <div class="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div>
          <div class="mb-3 flex items-center justify-between gap-3">
            <div><h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Prochaines relances</h3><p class="mt-1 text-xs text-gray-400">Avant échéance, jour J, puis relances mesurées à J+3, J+10 et J+20.</p></div>
            <strong class="font-display text-xl text-gray-950 dark:text-white">{{ reminderPreviewStatus === 'ready' ? (reminderPreview?.candidates.length || 0) : '—' }}</strong>
          </div>
          <div v-if="reminderPreviewStatus === 'loading'" role="status" class="grid min-h-28 place-items-center rounded-lg border border-gray-100 text-center dark:border-white/[0.08]"><div><span class="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /><p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Analyse des échéances…</p></div></div>
          <div v-else-if="reminderPreviewStatus === 'error'" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10"><p class="text-sm font-semibold text-rose-900 dark:text-rose-100">Analyse indisponible</p><p class="mt-1 text-xs text-rose-700 dark:text-rose-200">Les relances ne sont pas présentées tant que les données ne sont pas chargées.</p><button class="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white" @click="loadReminderPreview">Réessayer</button></div>
          <div v-else-if="reminderPreview?.candidates.length" class="divide-y divide-gray-100 rounded-lg border border-gray-100 dark:divide-white/[0.06] dark:border-white/[0.08]">
            <div v-for="candidate in reminderPreview.candidates.slice(0, 6)" :key="candidate.reminderKey" class="flex items-center gap-3 px-3 py-2.5">
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="candidate.urgency === 'overdue' ? 'bg-rose-500' : candidate.urgency === 'due' ? 'bg-amber-500' : 'bg-cyan-500'" />
              <div class="min-w-0 flex-1"><p class="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">{{ candidate.clientName }} · {{ candidate.number }}</p><p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{{ candidate.targetType === 'quote' ? 'Devis' : 'Facture' }} · {{ candidate.milestone }} · {{ candidate.dueDate }}<template v-if="candidate.targetType === 'invoice'"> · solde {{ reminderMoney(candidate.balanceCents, candidate.currency) }}</template></p></div>
            </div>
          </div>
          <div v-else class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center dark:border-white/[0.1]"><p class="text-sm font-medium text-gray-800 dark:text-gray-100">Aucune relance à envoyer</p><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Le moteur surveille les prochaines échéances.</p></div>
          <p v-if="reminderPreviewStatus === 'ready' && reminderPreview" class="mt-2 text-xs text-gray-400">{{ reminderPreview.skipped.alreadySent }} déjà envoyée(s) · {{ reminderPreview.skipped.missingContact }} sans adresse · {{ reminderPreview.skipped.paused }} suspendue(s) · {{ reminderPreview.skipped.outsideMilestone }} hors jalon</p>
        </div>
        <div>
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Historique récent</h3>
        <div v-if="reminderRuns.length" class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="run in reminderRuns.slice(0, 6)"
            :key="run.id"
            class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]"
          >
            <p class="truncate text-xs font-semibold text-gray-700 dark:text-gray-200">
              <template v-if="run.action === 'pipeline_reminder_run'">
                {{ run.payload?.sentCount || 0 }} envoye(s), {{ run.payload?.skippedCount || 0 }} ignore(s), {{ run.payload?.failedCount || 0 }} echec(s)
              </template>
              <template v-else>
                {{ run.payload?.targetType || 'email' }} {{ run.payload?.number || '' }}
              </template>
            </p>
            <p class="mt-1 truncate text-xs text-gray-400">{{ new Date(run.created_at).toLocaleString('fr-CH') }}</p>
          </div>
        </div>
          <p v-else class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-500 dark:border-white/[0.1] dark:text-gray-400">Aucun run disponible.</p>
        </div>
      </div>
    </section>
  </div>
</template>
