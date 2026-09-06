<script setup lang="ts">
import type { ContactMessage } from '~/types'
import AdminAdminIcon from '~/components/admin/AdminIcon.vue'
import AdminAdminEmptyState from '~/components/admin/AdminEmptyState.vue'
import { buildCommercialTaskSuggestions, type CommercialTaskSuggestion } from '~/utils/commercialTaskPlan'
import { isCommercialActionVisible, type CommercialActionState, type CommercialActionStatus } from '~/utils/commercialActionState'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const projects = useProjectsStore()
const articles = useArticlesStore()
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
const showTaskPlan = ref(false)
const selectedTaskSuggestionKeys = ref<string[]>([])
const showReminderConfirm = ref(false)
const selectedReminderKeys = ref<string[]>([])
const closeReminderConfirm = () => { showReminderConfirm.value = false }
const closeTaskPlan = () => { showTaskPlan.value = false }
const { dialogRef: reminderDialogRef, handleDialogKeydown: handleReminderDialogKeydown } = useAccessibleDialog(showReminderConfirm, closeReminderConfirm, '[data-reminder-cancel]')
const { dialogRef: taskPlanDialogRef, handleDialogKeydown: handleTaskPlanDialogKeydown } = useAccessibleDialog(showTaskPlan, closeTaskPlan, '[data-task-plan-close]')
const reminderRuns = ref<Array<{ id: number, action: string, payload: Record<string, any>, created_at: string }>>([])
const reminderRunsStatus = ref<'loading' | 'ready' | 'error'>('loading')
const reminderPreview = ref<{
  automationEnabled: boolean
  generatedAt: string
  candidates: Array<{ reminderKey: string, targetType: 'quote' | 'invoice', targetId: number, clientId: number, clientName: string, email: string, subject: string, bodyText: string, number: string, dueDate: string, milestone: string, urgency: 'upcoming' | 'due' | 'overdue', balanceCents?: number, currency?: string }>
  skipped: { alreadySent: number, missingContact: number, outsideMilestone: number, paused: number }
} | null>(null)
const reminderPreviewStatus = ref<'loading' | 'ready' | 'error'>('loading')
const commercialActionStates = ref<Record<string, CommercialActionState>>({})
const commercialActionStatesStatus = ref<'loading' | 'ready' | 'error'>('loading')
const updatingCommercialActionKey = ref<string | null>(null)

type DashboardSource = 'projects' | 'articles' | 'clients' | 'tasks' | 'quotes' | 'invoices' | 'appointments' | 'messages'
type SourceStatus = 'idle' | 'loading' | 'ready' | 'error'
type DashboardSectionId = 'metrics' | 'focus' | 'activity' | 'reminders'

type DashboardSectionPreference = {
  id: DashboardSectionId
  label: string
  description: string
  visible: boolean
}

const defaultDashboardSections: DashboardSectionPreference[] = [
  { id: 'metrics', label: 'Indicateurs essentiels', description: 'Encaissements, devis, tâches et nouveaux messages.', visible: true },
  { id: 'focus', label: 'Priorités et agenda', description: 'Ce qui demande une action immédiate.', visible: true },
  { id: 'activity', label: 'Commerce et production', description: 'Décisions commerciales et travail récent.', visible: true },
  { id: 'reminders', label: 'Relances clients', description: 'Échéances, messages à vérifier et historique.', visible: true },
]

const dashboardSections = ref<DashboardSectionPreference[]>(defaultDashboardSections.map(section => ({ ...section })))
const showDashboardSettings = ref(false)
const showDiagnostics = ref(false)
const showHelp = ref(false)
const dashboardHasMounted = ref(false)
const retryingSource = ref<DashboardSource | null>(null)
const sourceErrors = reactive<Record<DashboardSource, string>>({
  projects: '',
  articles: '',
  clients: '',
  tasks: '',
  quotes: '',
  invoices: '',
  appointments: '',
  messages: '',
})
const closeDashboardSettings = () => { showDashboardSettings.value = false }
const closeDiagnostics = () => { showDiagnostics.value = false }
const closeHelp = () => { showHelp.value = false }
const { dialogRef: settingsDialogRef, handleDialogKeydown: handleSettingsDialogKeydown } = useAccessibleDialog(showDashboardSettings, closeDashboardSettings, '[data-settings-close]')
const { dialogRef: diagnosticsDialogRef, handleDialogKeydown: handleDiagnosticsDialogKeydown } = useAccessibleDialog(showDiagnostics, closeDiagnostics, '[data-diagnostics-close]')
const { dialogRef: helpDialogRef, handleDialogKeydown: handleHelpDialogKeydown } = useAccessibleDialog(showHelp, closeHelp, '[data-help-close]')

const sourceLabels: Record<DashboardSource, string> = {
  projects: 'projets',
  articles: 'articles',
  clients: 'clients',
  tasks: 'tâches',
  quotes: 'devis',
  invoices: 'factures',
  appointments: 'agenda',
  messages: 'messages',
}
const sourceDescriptions: Record<DashboardSource, string> = {
  projects: 'Portfolio et projets clients',
  articles: 'Contenus du blog',
  clients: 'Clients et prospects',
  tasks: 'Tâches de production',
  quotes: 'Devis et décisions commerciales',
  invoices: 'Factures, soldes et paiements',
  appointments: 'Rendez-vous et agenda',
  messages: 'Demandes reçues depuis le site',
}
const sourceStates = reactive<Record<DashboardSource, SourceStatus>>({
  projects: 'idle',
  articles: 'idle',
  clients: 'idle',
  tasks: 'idle',
  quotes: 'idle',
  invoices: 'idle',
  appointments: 'idle',
  messages: 'idle',
})
const dashboardStatus = ref<'loading' | 'ready' | 'partial-error'>('loading')
const failedSources = ref<DashboardSource[]>([])
const loadedOrganizationId = ref<string | null>(null)
const lastUpdatedAt = ref<Date | null>(null)

const currentOrganizationName = computed(() => auth.organizations.find(item => item.id === auth.currentOrganizationId)?.name || 'Organisation active')
const dashboardIsLoading = computed(() => dashboardStatus.value === 'loading' || loadedOrganizationId.value !== auth.currentOrganizationId)
const lastUpdatedLabel = computed(() => lastUpdatedAt.value?.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) || 'jamais')
const failedSourceLabels = computed(() => failedSources.value.map(source => sourceLabels[source]).join(', '))
const selectedReminderCandidates = computed(() => reminderPreview.value?.candidates.filter(candidate => selectedReminderKeys.value.includes(candidate.reminderKey)) || [])
const commercialSourcesIncomplete = computed(() => (['messages', 'quotes', 'invoices'] as DashboardSource[]).some(source => sourceStates[source] !== 'ready'))
const visibleSectionCount = computed(() => dashboardSections.value.filter(section => section.visible).length)
const readySourceCount = computed(() => Object.values(sourceStates).filter(status => status === 'ready').length)
const dashboardSourceItems = computed(() => (Object.keys(sourceLabels) as DashboardSource[]).map(key => ({
  key,
  label: sourceLabels[key],
  description: sourceDescriptions[key],
  status: sourceStates[key],
  error: sourceErrors[key],
})))
const onboardingSteps = computed(() => [
  { label: 'Ajouter un premier client', description: 'Centralise ses coordonnées et son historique.', complete: sourceStates.clients === 'ready' && clients.clients.length > 0, to: '/admin/clients?new=1' },
  { label: 'Créer un projet', description: 'Relie le travail, les tâches et la facturation.', complete: sourceStates.projects === 'ready' && projects.projects.length > 0, to: '/admin/projects?new=1' },
  { label: 'Préparer un devis', description: 'Cadre la prochaine décision commerciale.', complete: sourceStates.quotes === 'ready' && quotes.quotes.length > 0, to: '/admin/quotes?new=1' },
  { label: 'Émettre une facture', description: 'Commence le suivi des encaissements.', complete: sourceStates.invoices === 'ready' && invoices.invoices.length > 0, to: '/admin/invoices?new=1' },
])
const onboardingCompletedCount = computed(() => onboardingSteps.value.filter(step => step.complete).length)
const nextOnboardingStep = computed(() => onboardingSteps.value.find(step => !step.complete))
let dashboardLoadVersion = 0
let reminderRunsRequestVersion = 0
let reminderPreviewRequestVersion = 0
let commercialActionStatesRequestVersion = 0

function dashboardPreferencesKey() {
  return `aq_admin_dashboard_sections:${auth.userEmail ?? 'anonymous'}:${auth.currentOrganizationId ?? 'default'}`
}

function loadDashboardPreferences() {
  if (!import.meta.client) return
  try {
    const parsed = JSON.parse(localStorage.getItem(dashboardPreferencesKey()) || '[]') as Array<{ id?: string, visible?: boolean }>
    const saved = parsed.filter(item => defaultDashboardSections.some(section => section.id === item.id))
    dashboardSections.value = [
      ...saved.map(item => {
        const base = defaultDashboardSections.find(section => section.id === item.id)!
        return { ...base, visible: item.visible !== false }
      }),
      ...defaultDashboardSections.filter(section => !saved.some(item => item.id === section.id)).map(section => ({ ...section })),
    ]
  }
  catch {
    dashboardSections.value = defaultDashboardSections.map(section => ({ ...section }))
  }
}

function persistDashboardPreferences() {
  if (!import.meta.client) return
  localStorage.setItem(dashboardPreferencesKey(), JSON.stringify(dashboardSections.value.map(({ id, visible }) => ({ id, visible }))))
}

function isSectionVisible(id: DashboardSectionId) {
  return dashboardSections.value.find(section => section.id === id)?.visible !== false
}

function sectionOrder(id: DashboardSectionId) {
  return dashboardSections.value.findIndex(section => section.id === id)
}

function toggleSection(id: DashboardSectionId) {
  const section = dashboardSections.value.find(item => item.id === id)
  if (!section || (section.visible && visibleSectionCount.value === 1)) return
  section.visible = !section.visible
  persistDashboardPreferences()
}

function moveSection(id: DashboardSectionId, direction: -1 | 1) {
  const index = dashboardSections.value.findIndex(section => section.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= dashboardSections.value.length) return
  const next = [...dashboardSections.value]
  const [section] = next.splice(index, 1)
  if (!section) return
  next.splice(target, 0, section)
  dashboardSections.value = next
  persistDashboardPreferences()
}

function resetDashboardPreferences() {
  dashboardSections.value = defaultDashboardSections.map(section => ({ ...section }))
  persistDashboardPreferences()
}

function sourceStatusLabel(status: SourceStatus) {
  return {
    idle: 'En attente',
    loading: 'Actualisation…',
    ready: 'À jour',
    error: 'Indisponible',
  }[status]
}

function readableError(error: unknown) {
  const value = error as { data?: { message?: string }, message?: string }
  return value?.data?.message || value?.message || 'La source n’a pas répondu. Réessaie dans quelques instants.'
}

const todayIso = computed(() => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date()))
const nowIso = computed(() => new Date().toISOString())
const todayLabel = computed(() => new Date().toLocaleDateString('fr-CH', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
}))
const commercialSnoozeOptions = computed(() => [
  { label: 'Demain', date: addDaysToIsoDate(todayIso.value, 1) },
  { label: 'Dans 7 jours', date: addDaysToIsoDate(todayIso.value, 7) },
  { label: 'Dans 30 jours', date: addDaysToIsoDate(todayIso.value, 30) },
])

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

const rawCommercialTaskSuggestions = computed(() => {
  if ((['clients', 'tasks', 'quotes', 'invoices'] as DashboardSource[]).some(source => sourceStates[source] !== 'ready')) return []
  return buildCommercialTaskSuggestions({
    today: todayIso.value,
    clients: clients.clients,
    quotes: quotes.quotes,
    invoices: invoices.invoices,
    existingTaskTitles: tasks.tasks.map(task => task.title),
  })
})

function commercialActionIsVisible(actionKey: string) {
  if (commercialActionStatesStatus.value !== 'ready') return true
  return isCommercialActionVisible(actionKey, commercialActionStates.value, todayIso.value)
}

const commercialTaskSuggestions = computed(() =>
  rawCommercialTaskSuggestions.value.filter(suggestion => commercialActionIsVisible(suggestion.key)),
)

const selectedTaskSuggestions = computed(() => {
  const selected = new Set(selectedTaskSuggestionKeys.value)
  return commercialTaskSuggestions.value.filter(suggestion => selected.has(suggestion.key))
})

const nextAppointments = computed(() =>
  sourceStates.appointments === 'ready'
    ? appointments.appointments
    .filter(appointment => appointment.status === 'scheduled' && appointment.startsAt >= nowIso.value)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 5)
    : [],
)

const newMessages = computed(() =>
  messages.value
    .filter(message => message.status === 'new')
    .slice(0, 6),
)

const monthRevenue = computed(() => {
  const monthStart = `${todayIso.value.slice(0, 7)}-01`
  const totals: Record<string, number> = {}
  for (const invoice of invoices.invoices) {
    const currency = invoice.currency || 'CHF'
    const payments = (invoice.payments || []).filter(payment => !payment.voidedAt && payment.paidAt >= monthStart && payment.paidAt <= todayIso.value)
    const paidThisMonth = payments.length
      ? payments.reduce((sum, payment) => sum + payment.amountCents, 0)
      : invoice.status === 'paid' && invoice.paidAt && invoice.paidAt >= monthStart && invoice.paidAt <= todayIso.value
        ? (invoice.totalCents ?? invoice.amountCents)
        : 0
    totals[currency] = (totals[currency] || 0) + (invoice.documentType === 'credit_note' ? -paidThisMonth : paidThisMonth)
  }
  return totals
})

const expectedRevenue = computed(() => {
  const next30 = addDaysToIsoDate(todayIso.value, 30)
  const totals: Record<string, number> = {}
  for (const invoice of invoices.invoices.filter(invoice => invoice.documentType === 'invoice' && ['sent', 'overdue'].includes(invoice.status) && invoice.dueAt && invoice.dueAt <= next30)) {
    const currency = invoice.currency || 'CHF'
    const outstanding = Math.max(0, (invoice.totalCents ?? invoice.amountCents) - invoice.paidAmountCents)
    totals[currency] = (totals[currency] || 0) + outstanding
  }
  return totals
})

const quoteValue = computed(() => {
  const totals: Record<string, number> = {}
  for (const quote of pendingQuotes.value) {
    const currency = quote.currency || 'CHF'
    totals[currency] = (totals[currency] || 0) + (quote.totalCents ?? quote.amountCents)
  }
  return totals
})

const metrics = computed(() => [
  {
    label: 'À encaisser sous 30 jours',
    value: sourceStates.invoices === 'ready' ? formatCurrencyTotals(expectedRevenue.value) : '—',
    meta: sourceStates.invoices === 'ready' ? `${overdueInvoices.value.length} facture(s) en retard` : 'Factures indisponibles',
    icon: 'receipt',
    to: '/admin/invoices',
    tone: 'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10',
    bar: 'bg-rose-500',
  },
  {
    label: 'Devis en attente de décision',
    value: sourceStates.quotes === 'ready' ? formatCurrencyTotals(quoteValue.value) : '—',
    meta: sourceStates.quotes === 'ready' ? `${pendingQuotes.value.length} devis envoyé(s)` : 'Devis indisponibles',
    icon: 'file-plus',
    to: '/admin/quotes',
    tone: 'text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10',
    bar: 'bg-sky-500',
  },
  {
    label: 'À faire aujourd’hui',
    value: sourceStates.tasks === 'ready' ? dueTasks.value.length : '—',
    meta: sourceStates.tasks === 'ready' ? `${openTasks.value.length} tâche(s) ouverte(s)` : 'Tâches indisponibles',
    icon: 'check-square',
    to: '/admin/tasks',
    tone: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10',
    bar: 'bg-amber-500',
  },
  {
    label: 'Nouveaux messages',
    value: sourceStates.messages === 'ready' ? newMessages.value.length : '—',
    meta: sourceStates.messages === 'ready' ? 'À lire dans la messagerie' : 'Messages indisponibles',
    icon: 'mail',
    to: '/admin/messages',
    tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10',
    bar: 'bg-emerald-500',
  },
])

type PriorityItem = {
  id: string
  title: string
  meta: string
  to: string
  icon: string
  label: string
  chip: string
  order: number
  actionKey: string
  sourceType: 'suggestion' | 'task' | 'message'
  sourceId: number
}

const priorities = computed(() => {
  const items: PriorityItem[] = []

  const focusedSuggestions = [
    ...commercialTaskSuggestions.value.filter(suggestion => suggestion.kind === 'invoice').slice(0, 3),
    ...commercialTaskSuggestions.value.filter(suggestion => suggestion.kind === 'lead').slice(0, 3),
    ...commercialTaskSuggestions.value.filter(suggestion => suggestion.kind === 'quote').slice(0, 2),
  ]
  for (const suggestion of focusedSuggestions) {
    const source = suggestion.kind === 'quote'
      ? quotes.quotes.find(quote => quote.id === suggestion.sourceId)?.number
      : suggestion.kind === 'invoice'
        ? invoices.invoices.find(invoice => invoice.id === suggestion.sourceId)?.number
        : clientName(suggestion.clientId)
    items.push({
      id: `suggestion-${suggestion.key}`,
      title: `Relancer ${source || 'le client'}`,
      meta: suggestion.reason,
      to: suggestion.to,
      icon: suggestion.kind === 'invoice' ? 'receipt' : suggestion.kind === 'quote' ? 'file-plus' : 'users',
      label: suggestion.label,
      chip: suggestion.priority === 'high'
        ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
        : 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
      order: suggestion.kind === 'invoice' ? 0 : suggestion.kind === 'lead' ? 4 : 5,
      actionKey: suggestion.key,
      sourceType: 'suggestion',
      sourceId: suggestion.sourceId,
    })
  }

  if (sourceStates.tasks === 'ready') {
    for (const task of dueTasks.value.filter(task => commercialActionIsVisible(`task:${task.id}`)).slice(0, 4)) {
      items.push({
        id: `task-${task.id}`,
        title: task.title,
        meta: task.dueDate ? `Échéance ${task.dueDate}${task.clientId ? ` · ${clientName(task.clientId)}` : ''}` : 'Sans échéance',
        to: `/admin/tasks?taskId=${task.id}`,
        icon: 'check-square',
        label: task.dueDate && task.dueDate < todayIso.value ? 'En retard' : 'Aujourd’hui',
        chip: task.dueDate && task.dueDate < todayIso.value
          ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
        order: task.priority === 'high' ? 1 : 2,
        actionKey: `task:${task.id}`,
        sourceType: 'task',
        sourceId: task.id,
      })
    }
  }

  if (sourceStates.messages === 'ready') {
    for (const message of newMessages.value.filter(message => commercialActionIsVisible(`message:${message.id}`)).slice(0, 2)) {
      items.push({
        id: `message-${message.id}`,
        title: `Répondre à ${message.name}`,
        meta: message.subject || message.email,
        to: `/admin/messages?messageId=${message.id}`,
        icon: 'mail',
        label: 'Nouveau prospect',
        chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
        order: 3,
        actionKey: `message:${message.id}`,
        sourceType: 'message',
        sourceId: message.id,
      })
    }
  }

  return items.sort((a, b) => a.order - b.order).slice(0, 8)
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

  for (const message of sourceStates.messages === 'ready' ? newMessages.value : []) {
    rows.push({
      id: `message-${message.id}`,
      type: 'Lead',
      title: message.name,
      meta: message.subject || message.email,
      value: 'Nouveau',
      to: `/admin/messages?messageId=${message.id}`,
      tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10',
    })
  }

  for (const invoice of sourceStates.invoices === 'ready' ? overdueInvoices.value.slice(0, 4) : []) {
    rows.push({
      id: `invoice-${invoice.id}`,
      type: 'Facture',
      title: invoice.number,
      meta: clientName(invoice.clientId),
      value: money(Math.max(0, (invoice.totalCents ?? invoice.amountCents) - invoice.paidAmountCents), invoice.currency),
      to: `/admin/invoices?invoiceId=${invoice.id}`,
      tone: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10',
    })
  }

  for (const quote of sourceStates.quotes === 'ready' ? pendingQuotes.value.slice(0, 4) : []) {
    rows.push({
      id: `quote-${quote.id}`,
      type: 'Devis',
      title: quote.number,
      meta: clientName(quote.clientId),
      value: money(quote.totalCents ?? quote.amountCents, quote.currency),
      to: `/admin/quotes?quoteId=${quote.id}`,
      tone: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10',
    })
  }

  return rows.slice(0, 8)
})

const productionRows = computed(() =>
  sourceStates.tasks === 'ready' ? openTasks.value.slice(0, 5).map(task => ({
    id: task.id,
    title: task.title,
    meta: task.dueDate ? `Échéance ${task.dueDate}` : 'Sans échéance',
    status: task.priority,
    to: `/admin/tasks?taskId=${task.id}`,
  })) : [],
)

const recentProjects = computed(() => sourceStates.projects === 'ready' ? projects.projects.slice(0, 3) : [])
const recentArticles = computed(() => sourceStates.articles === 'ready' ? articles.articles.slice(0, 3) : [])

function addDaysToIsoDate(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function money(cents: number, currency = 'CHF') {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatCurrencyTotals(totals: Record<string, number>) {
  const entries = Object.entries(totals).filter(([, cents]) => cents !== 0)
  if (!entries.length) return money(0)
  return entries.map(([currency, cents]) => money(cents, currency)).join(' · ')
}

function reminderMoney(cents = 0, currency = 'CHF') {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency }).format(cents / 100)
}

function urgencyLabel(urgency: 'upcoming' | 'due' | 'overdue') {
  return urgency === 'overdue' ? 'En retard' : urgency === 'due' ? 'Échéance aujourd’hui' : 'À venir'
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
  if (sourceStates.clients !== 'ready') return 'Client non chargé'
  return clients.clients.find(client => client.id === clientId)?.name || `Client #${clientId}`
}

async function loadReminderRuns() {
  const requestVersion = ++reminderRunsRequestVersion
  const organizationId = auth.currentOrganizationId
  reminderRunsStatus.value = 'loading'
  try {
    const runs = await $fetch<Array<{ id: number, action: string, payload: Record<string, any>, created_at: string }>>('/api/admin/pipeline/runs', {
      headers: auth.authHeader(),
    })
    if (requestVersion !== reminderRunsRequestVersion || organizationId !== auth.currentOrganizationId) return
    reminderRuns.value = runs
    reminderRunsStatus.value = 'ready'
  }
  catch (error) {
    if (requestVersion !== reminderRunsRequestVersion || organizationId !== auth.currentOrganizationId) return
    reminderRuns.value = []
    reminderRunsStatus.value = 'error'
  }
}

async function loadReminderPreview() {
  const requestVersion = ++reminderPreviewRequestVersion
  const organizationId = auth.currentOrganizationId
  reminderPreviewStatus.value = 'loading'
  try {
    const preview = await $fetch<NonNullable<typeof reminderPreview.value>>('/api/admin/pipeline/reminders', { headers: auth.authHeader() })
    if (requestVersion !== reminderPreviewRequestVersion || organizationId !== auth.currentOrganizationId) return
    reminderPreview.value = preview
    selectedReminderKeys.value = []
    reminderPreviewStatus.value = 'ready'
  }
  catch {
    if (requestVersion !== reminderPreviewRequestVersion || organizationId !== auth.currentOrganizationId) return
    reminderPreview.value = null
    reminderPreviewStatus.value = 'error'
  }
}

async function loadMessages() {
  return await $fetch<ContactMessage[]>('/api/messages', {
    headers: auth.authHeader(),
  })
}

async function loadCommercialActionStates() {
  const requestVersion = ++commercialActionStatesRequestVersion
  const organizationId = auth.currentOrganizationId
  commercialActionStatesStatus.value = 'loading'
  try {
    const states = await $fetch<Record<string, CommercialActionState>>('/api/admin/commercial-actions', {
      headers: auth.authHeader(),
    })
    if (requestVersion !== commercialActionStatesRequestVersion || organizationId !== auth.currentOrganizationId) return
    commercialActionStates.value = states
    commercialActionStatesStatus.value = 'ready'
  }
  catch {
    if (requestVersion !== commercialActionStatesRequestVersion || organizationId !== auth.currentOrganizationId) return
    commercialActionStates.value = {}
    commercialActionStatesStatus.value = 'error'
  }
}

async function updateCommercialAction(item: PriorityItem, status: CommercialActionStatus, snoozedUntil: string | null = null) {
  if (updatingCommercialActionKey.value || commercialActionStatesStatus.value !== 'ready') return
  updatingCommercialActionKey.value = item.actionKey
  let taskCompleted = false

  try {
    if (status === 'handled' && item.sourceType === 'task') {
      const task = tasks.tasks.find(candidate => candidate.id === item.sourceId)
      if (!task) throw new Error('Tâche introuvable')
      await tasks.update(task.id, { ...task, status: 'done' })
      taskCompleted = true
    }

    const state = await $fetch<CommercialActionState>('/api/admin/commercial-actions', {
      method: 'POST',
      headers: auth.authHeader(),
      body: {
        actionKey: item.actionKey,
        status,
        snoozedUntil,
        targetPath: item.to,
      },
    })
    commercialActionStates.value = { ...commercialActionStates.value, [item.actionKey]: state }
    const message = status === 'handled'
      ? 'Action marquée comme traitée'
      : status === 'ignored'
        ? 'Action retirée du cockpit'
        : `Action reportée au ${new Date(`${snoozedUntil}T12:00:00`).toLocaleDateString('fr-CH')}`
    toast.success(message)
  }
  catch (error) {
    if (taskCompleted) {
      toast.error('La tâche est terminée, mais son historique n’a pas pu être enregistré.')
    }
    else {
      toast.error(readableError(error))
    }
  }
  finally {
    updatingCommercialActionKey.value = null
  }
}

function toggleReminder(reminderKey: string) {
  selectedReminderKeys.value = selectedReminderKeys.value.includes(reminderKey)
    ? selectedReminderKeys.value.filter(key => key !== reminderKey)
    : [...selectedReminderKeys.value, reminderKey]
}

function requestReminderSend() {
  if (!reminderPreview.value?.candidates.length) return
  showReminderConfirm.value = true
}

function taskSuggestionSource(suggestion: CommercialTaskSuggestion) {
  if (suggestion.kind === 'lead') return clientName(suggestion.clientId)
  if (suggestion.kind === 'quote') return quotes.quotes.find(quote => quote.id === suggestion.sourceId)?.number || 'Devis'
  return invoices.invoices.find(invoice => invoice.id === suggestion.sourceId)?.number || 'Facture'
}

function toggleTaskSuggestion(key: string) {
  selectedTaskSuggestionKeys.value = selectedTaskSuggestionKeys.value.includes(key)
    ? selectedTaskSuggestionKeys.value.filter(item => item !== key)
    : [...selectedTaskSuggestionKeys.value, key]
}

function requestTaskGeneration() {
  if (!commercialTaskSuggestions.value.length) {
    toast.success('Aucune nouvelle tâche commerciale à créer')
    return
  }
  selectedTaskSuggestionKeys.value = []
  showTaskPlan.value = true
}

async function confirmTaskGeneration() {
  if (runningAutomation.value || !selectedTaskSuggestions.value.length) return
  runningAutomation.value = true
  const suggestions = [...selectedTaskSuggestions.value]

  try {
    let created = 0
    for (const suggestion of suggestions) {
      await tasks.add({
        title: suggestion.title,
        description: suggestion.description,
        status: 'todo',
        priority: suggestion.priority,
        dueDate: suggestion.dueDate,
        clientId: suggestion.clientId,
        projectId: suggestion.projectId,
      })
      created++
    }
    showTaskPlan.value = false
    selectedTaskSuggestionKeys.value = []
    toast.success(`${created} tâche(s) commerciale(s) créée(s)`)
  } catch {
    toast.error('Certaines tâches n’ont pas pu être créées. La liste a été recalculée sans dupliquer celles déjà ajoutées.')
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
      body: {
        confirmedReminders: selectedReminderCandidates.value.map(candidate => ({
          reminderKey: candidate.reminderKey,
          email: candidate.email,
          subject: candidate.subject,
          bodyText: candidate.bodyText,
        })),
      },
      headers: auth.authHeader(),
    })

    toast.success(`Emails: ${result.sentCount} envoyé(s), ${result.skippedCount} ignoré(s), ${result.failedCount} échec(s) · ${result.overdueMarkedCount} facture(s) passée(s) en retard`)
    showReminderConfirm.value = false
    await Promise.allSettled([loadReminderRuns(), loadReminderPreview()])
  } catch (error: any) {
    toast.error(error?.data?.message || 'Erreur envoi relances email')
    await loadReminderPreview()
  } finally {
    runningEmailReminders.value = false
  }
}

function dashboardSources(force = false): Array<{ key: DashboardSource, run: () => Promise<unknown> }> {
  return [
    { key: 'projects', run: () => projects.ensureLoaded(force) },
    { key: 'articles', run: () => articles.ensureLoaded(force) },
    { key: 'clients', run: () => clients.ensureLoaded(force) },
    { key: 'tasks', run: () => tasks.ensureLoaded(force) },
    { key: 'quotes', run: () => quotes.ensureLoaded(force) },
    { key: 'invoices', run: () => invoices.ensureLoaded(force) },
    { key: 'appointments', run: () => appointments.ensureLoaded(force) },
    { key: 'messages', run: loadMessages },
  ]
}

async function retrySource(sourceKey: DashboardSource) {
  if (retryingSource.value) return
  const source = dashboardSources(true).find(item => item.key === sourceKey)
  if (!source) return
  retryingSource.value = sourceKey
  sourceStates[sourceKey] = 'loading'
  sourceErrors[sourceKey] = ''
  try {
    const result = await source.run()
    if (sourceKey === 'messages') messages.value = result as ContactMessage[]
    sourceStates[sourceKey] = 'ready'
    failedSources.value = failedSources.value.filter(item => item !== sourceKey)
    dashboardStatus.value = failedSources.value.length ? 'partial-error' : 'ready'
  }
  catch (error) {
    sourceStates[sourceKey] = 'error'
    sourceErrors[sourceKey] = readableError(error)
    if (!failedSources.value.includes(sourceKey)) failedSources.value.push(sourceKey)
    dashboardStatus.value = 'partial-error'
  }
  finally {
    retryingSource.value = null
  }
}

async function loadDashboard(force = false) {
  const requestVersion = ++dashboardLoadVersion
  dashboardStatus.value = 'loading'
  failedSources.value = []
  const organizationId = auth.currentOrganizationId
  const commercialActionStatesLoad = loadCommercialActionStates()
  const sources = dashboardSources(force)

  for (const source of sources) {
    sourceStates[source.key] = 'loading'
    sourceErrors[source.key] = ''
  }
  const results = await Promise.allSettled(sources.map(source => source.run()))
  if (requestVersion !== dashboardLoadVersion || organizationId !== auth.currentOrganizationId) return
  results.forEach((result, index) => {
    const source = sources[index]
    if (!source) return
    sourceStates[source.key] = result.status === 'fulfilled' ? 'ready' : 'error'
    if (result.status === 'rejected') {
      failedSources.value.push(source.key)
      sourceErrors[source.key] = readableError(result.reason)
    }
    if (source.key === 'messages' && result.status === 'fulfilled') messages.value = result.value as ContactMessage[]
  })

  loadedOrganizationId.value = organizationId
  lastUpdatedAt.value = new Date()
  dashboardStatus.value = failedSources.value.length ? 'partial-error' : 'ready'
  await Promise.allSettled([loadReminderRuns(), loadReminderPreview(), commercialActionStatesLoad])
}

onMounted(() => {
  dashboardHasMounted.value = true
  loadDashboardPreferences()
  void loadDashboard()
})

watch(() => auth.currentOrganizationId, (organizationId, previousOrganizationId) => {
  if (!organizationId || organizationId === previousOrganizationId) return
  loadDashboardPreferences()
  void loadDashboard(true)
})
</script>

<template>
  <div class="space-y-4 lg:space-y-5" :aria-busy="dashboardIsLoading">
    <section class="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-20 right-[6%] h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-medium capitalize text-gray-500 dark:text-gray-400">
            {{ dashboardHasMounted ? `${todayLabel} · ${currentOrganizationName}` : 'Tableau de bord opérationnel' }}
          </p>
          <h1 class="mt-1 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">
            Tableau de bord
          </h1>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Les prochaines actions utiles, classées pour avancer sans relire toute ton activité.
          </p>
          <p class="mt-2 flex items-center gap-2 text-xs" :class="dashboardStatus === 'partial-error' ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'">
            <span class="h-2 w-2 rounded-full" :class="dashboardStatus === 'partial-error' ? 'bg-rose-500' : dashboardIsLoading ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'" />
            <span v-if="dashboardIsLoading">Actualisation en cours…</span>
            <span v-else-if="dashboardStatus === 'partial-error'">Données partielles · mise à jour à {{ lastUpdatedLabel }}</span>
            <span v-else>Données à jour à {{ lastUpdatedLabel }}</span>
          </p>
          <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            <button type="button" class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-gray-600 underline-offset-4 hover:text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:text-violet-300" @click="showDiagnostics = true">
              <AdminAdminIcon icon="activity" class="h-3.5 w-3.5" />
              État détaillé
            </button>
            <button type="button" class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-gray-600 underline-offset-4 hover:text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:text-violet-300" @click="showDashboardSettings = true">
              <AdminAdminIcon icon="settings" class="h-3.5 w-3.5" />
              Personnaliser
            </button>
            <button type="button" class="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-gray-600 underline-offset-4 hover:text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:text-violet-300" @click="showHelp = true">
              <AdminAdminIcon icon="help-circle" class="h-3.5 w-3.5" />
              Aide et raccourcis
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <NuxtLink to="/admin/messages" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]">
            <AdminAdminIcon icon="mail" class="h-4 w-4" />
            Messages
          </NuxtLink>
          <NuxtLink to="/admin/tasks?new=1" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]">
            <AdminAdminIcon icon="check-square" class="h-4 w-4" />
            Nouvelle tâche
          </NuxtLink>
          <NuxtLink to="/admin/quotes?new=1" class="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 text-xs font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:bg-white dark:text-gray-950 sm:col-span-1">
            <AdminAdminIcon icon="file-plus" class="h-4 w-4" />
            Nouveau devis
          </NuxtLink>
        </div>
      </div>
    </section>

    <div v-if="dashboardStatus === 'partial-error'" role="alert" class="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100 sm:flex-row sm:items-center sm:justify-between">
      <div><p class="font-semibold">Certaines données sont indisponibles</p><p class="mt-1 text-xs text-rose-700 dark:text-rose-200">Sources concernées : {{ failedSourceLabels }}. Les valeurs correspondantes sont masquées pour éviter toute confusion.</p></div>
      <button class="min-h-11 shrink-0 rounded-lg bg-rose-700 px-4 text-xs font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500" @click="loadDashboard(true)">Réessayer</button>
    </div>

    <div v-if="dashboardIsLoading" role="status" aria-live="polite" class="space-y-4">
      <span class="sr-only">Chargement du tableau de bord</span>
      <div class="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <div v-for="index in 4" :key="index" class="h-28 animate-pulse rounded-xl bg-gray-200/70 dark:bg-white/[0.06]" />
      </div>
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div class="h-64 animate-pulse rounded-xl bg-gray-200/70 dark:bg-white/[0.06]" />
        <div class="h-48 animate-pulse rounded-xl bg-gray-200/70 dark:bg-white/[0.06]" />
      </div>
    </div>

    <div v-else class="flex flex-col gap-4 lg:gap-5">
    <section v-show="isSectionVisible('metrics')" class="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 xl:grid-cols-4" :style="{ order: sectionOrder('metrics') }" aria-label="Indicateurs clés">
      <NuxtLink
        v-for="metric in metrics"
        :key="metric.label"
        :to="metric.to"
        class="group relative min-h-[112px] overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-violet-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/[0.08] dark:bg-[#111118] dark:hover:border-violet-400/40 sm:p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-xs font-medium text-gray-500 dark:text-gray-400">{{ metric.label }}</p>
            <p class="mt-2 truncate text-xl font-semibold text-gray-950 dark:text-white sm:text-2xl">{{ metric.value }}</p>
          </div>
          <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="metric.tone">
            <AdminAdminIcon :icon="metric.icon" class="h-4 w-4" />
          </span>
        </div>
        <p class="mt-3 truncate text-xs text-gray-500 dark:text-gray-400">{{ metric.meta }}</p>
      </NuxtLink>
    </section>

    <section v-show="isSectionVisible('focus')" class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]" :style="{ order: sectionOrder('focus') }">
      <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-gray-950 dark:text-white">À traiter aujourd’hui</h2>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Tâches dues, prospects inactifs, devis sans réponse et factures à relancer.</p>
          </div>
          <div class="shrink-0 text-right">
            <span class="block text-xs font-medium text-gray-500 dark:text-gray-400">{{ priorities.length }} action(s)</span>
            <button v-if="commercialActionStatesStatus === 'error'" type="button" class="mt-1 text-xs font-semibold text-rose-700 underline decoration-rose-300 underline-offset-2 dark:text-rose-300" @click="loadCommercialActionStates">
              Recharger les actions
            </button>
          </div>
        </div>

        <div v-if="priorities.length" class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <div
            v-for="item in priorities"
            :key="item.id"
            class="relative transition hover:bg-gray-50 dark:hover:bg-white/[0.03] sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch"
          >
            <NuxtLink
              :to="item.to"
              class="group grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 sm:px-5"
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

            <div class="grid grid-cols-3 border-t border-gray-100 dark:border-white/[0.06] sm:flex sm:items-center sm:border-l sm:border-t-0 sm:px-2">
              <button
                type="button"
                class="min-h-11 px-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                :disabled="commercialActionStatesStatus !== 'ready' || updatingCommercialActionKey !== null"
                :aria-label="`Marquer « ${item.title} » comme traité`"
                @click="updateCommercialAction(item, 'handled')"
              >
                {{ updatingCommercialActionKey === item.actionKey ? 'Patiente…' : 'Traité' }}
              </button>

              <details class="group/reporter relative border-x border-gray-100 dark:border-white/[0.06] sm:border-x-0">
                <summary
                  class="flex min-h-11 cursor-pointer list-none items-center justify-center px-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:bg-white/[0.06] [&::-webkit-details-marker]:hidden"
                  :class="commercialActionStatesStatus !== 'ready' || updatingCommercialActionKey !== null ? 'pointer-events-none opacity-45' : ''"
                  :aria-disabled="commercialActionStatesStatus !== 'ready' || updatingCommercialActionKey !== null"
                >
                  Reporter
                </summary>
                <div class="absolute bottom-full right-1/2 z-20 mb-2 w-40 translate-x-1/2 overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-xl dark:border-white/[0.12] dark:bg-[#181822] sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:translate-x-0">
                  <button
                    v-for="option in commercialSnoozeOptions"
                    :key="option.date"
                    type="button"
                    class="flex min-h-10 w-full items-center rounded-md px-3 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-200 dark:hover:bg-white/[0.06]"
                    :aria-label="`Reporter « ${item.title} » : ${option.label.toLowerCase()}`"
                    @click="updateCommercialAction(item, 'snoozed', option.date)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </details>

              <button
                type="button"
                class="min-h-11 px-2 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-45 dark:text-gray-400 dark:hover:bg-white/[0.06]"
                :disabled="commercialActionStatesStatus !== 'ready' || updatingCommercialActionKey !== null"
                :aria-label="`Ignorer « ${item.title} »`"
                @click="updateCommercialAction(item, 'ignored')"
              >
                Ignorer
              </button>
            </div>
          </div>
        </div>

        <AdminAdminEmptyState
          v-else
          title="Aucune action urgente"
          :body="dashboardStatus === 'partial-error' ? 'Aucune action détectée dans les sources disponibles. Recharge les données manquantes pour confirmer.' : 'Toutes les sources sont à jour et rien ne demande une intervention immédiate.'"
        />
      </div>

      <aside class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
          <div>
            <h2 class="text-sm font-semibold text-gray-950 dark:text-white">Aujourd'hui</h2>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Tes cinq prochains rendez-vous.</p>
          </div>
          <NuxtLink to="/admin/appointments" class="text-xs font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white">
            Agenda
          </NuxtLink>
        </div>

        <div v-if="sourceStates.appointments === 'error'" class="px-4 py-4" role="alert">
          <p class="text-sm font-semibold text-rose-700 dark:text-rose-300">Agenda indisponible</p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Réessaie le chargement avant de planifier ta journée.</p>
        </div>
        <div v-else-if="nextAppointments.length" class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <NuxtLink
            v-for="appointment in nextAppointments"
            :key="appointment.id"
            :to="`/admin/appointments?appointmentId=${appointment.id}`"
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

        <AdminAdminEmptyState v-else title="Agenda libre" body="Aucun rendez-vous programmé." />
      </aside>
    </section>

    <section v-show="isSectionVisible('activity')" class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" :style="{ order: sectionOrder('activity') }">
      <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-gray-950 dark:text-white">Décisions commerciales</h2>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ sourceStates.invoices === 'ready' ? `${formatCurrencyTotals(monthRevenue)} encaissés ce mois-ci.` : 'Encaissements indisponibles.' }}</p>
          </div>
          <NuxtLink to="/admin/clients" class="shrink-0 text-xs font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white">
            CRM
          </NuxtLink>
        </div>

        <div v-if="commercialSourcesIncomplete" class="px-4 py-4" role="alert">
          <p class="text-sm font-semibold text-rose-700 dark:text-rose-300">Pipeline partiellement indisponible</p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Le calme ne peut être confirmé tant que messages, devis et factures ne sont pas tous chargés.</p>
        </div>
        <div v-else-if="commercialRows.length" class="divide-y divide-gray-100 dark:divide-white/[0.06]">
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

        <AdminAdminEmptyState v-else title="Pipeline calme" body="Aucun prospect, devis ou impayé critique." />
      </div>

      <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-gray-950 dark:text-white">Travail en cours</h2>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Tâches et contenus récemment touchés.</p>
          </div>
          <NuxtLink to="/admin/projects" class="shrink-0 text-xs font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white">
            Projets
          </NuxtLink>
        </div>

        <div class="grid gap-0 divide-y divide-gray-100 dark:divide-white/[0.06]">
          <div v-if="productionRows.length" class="px-4 py-3 sm:px-5">
            <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Tâches ouvertes</p>
            <div class="space-y-2">
              <NuxtLink
                v-for="task in productionRows"
                :key="task.id"
                :to="task.to"
                class="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 transition hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-gray-950 dark:text-white">{{ task.title }}</p>
                  <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ task.meta }}</p>
                </div>
                <span class="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200 dark:bg-white/[0.04] dark:text-gray-300 dark:ring-white/[0.08]">
                  {{ task.status === 'high' ? 'Haute' : task.status === 'medium' ? 'Moyenne' : 'Basse' }}
                </span>
              </NuxtLink>
            </div>
          </div>

          <div class="grid gap-0 divide-y divide-gray-100 dark:divide-white/[0.06] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div class="px-4 py-3 sm:px-5">
              <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Projets récents</p>
              <div class="space-y-2">
                <NuxtLink
                  v-for="project in recentProjects"
                  :key="project.id"
                  :to="`/admin/projects/${project.id}`"
                  class="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2 transition hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                >
                  <div class="h-9 w-9 shrink-0 overflow-hidden rounded-md">
                    <img v-if="project.image" :src="project.image" class="h-full w-full object-cover" alt="" loading="lazy">
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
                <p v-if="sourceStates.projects === 'error'" class="text-xs text-rose-600 dark:text-rose-300">Projets indisponibles.</p>
                <p v-else-if="!recentProjects.length" class="text-xs text-gray-500 dark:text-gray-400">Aucun projet.</p>
              </div>
            </div>

            <div class="px-4 py-3 sm:px-5">
              <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Articles récents</p>
              <div class="space-y-2">
                <NuxtLink
                  v-for="article in recentArticles"
                  :key="article.id"
                  :to="`/admin/articles?editId=${article.id}`"
                  class="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2 transition hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                >
                  <div class="h-9 w-9 shrink-0 overflow-hidden rounded-md">
                    <img v-if="article.coverImage" :src="article.coverImage" class="h-full w-full object-cover" alt="" loading="lazy">
                    <div v-else class="flex h-full w-full items-center justify-center bg-fuchsia-100 text-fuchsia-500 dark:bg-fuchsia-500/10 dark:text-fuchsia-400">
                      <AdminAdminIcon icon="file-text" class="h-4 w-4" />
                    </div>
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-gray-950 dark:text-white">{{ article.title }}</p>
                    <span v-if="article.published" class="mt-0.5 inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Publié</span>
                    <span v-else class="mt-0.5 inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">brouillon</span>
                  </div>
                </NuxtLink>
                <p v-if="sourceStates.articles === 'error'" class="text-xs text-rose-600 dark:text-rose-300">Articles indisponibles.</p>
                <p v-else-if="!recentArticles.length" class="text-xs text-gray-500 dark:text-gray-400">Aucun article.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-show="isSectionVisible('reminders')" class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]" :style="{ order: sectionOrder('reminders') }">
      <div class="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-gray-950 dark:text-white">Relances clients</h2>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <p id="reminder-help" class="text-xs text-gray-500 dark:text-gray-400">Prépare les rappels à des échéances précises et vérifie chaque destinataire avant l’envoi.</p>
            <span v-if="reminderPreviewStatus === 'ready' && reminderPreview" class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="reminderPreview.automationEnabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'">
              {{ reminderPreview.automationEnabled ? 'Automatique actif' : 'Mode manuel' }}
            </span>
            <span v-else-if="reminderPreviewStatus === 'error'" class="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">Indisponible</span>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-2 sm:flex">
          <button
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]"
            :disabled="runningAutomation"
            @click="requestTaskGeneration"
          >
            <AdminAdminIcon icon="zap" class="h-4 w-4" />
            {{ runningAutomation ? 'Génération…' : `Préparer ${commercialTaskSuggestions.length} tâche(s)` }}
          </button>
          <button
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-950"
            :disabled="runningEmailReminders || reminderPreviewStatus !== 'ready' || !reminderPreview?.candidates.length"
            aria-describedby="reminder-help"
            @click="requestReminderSend"
          >
            <AdminAdminIcon icon="mail" class="h-4 w-4" />
            {{ runningEmailReminders ? 'Envoi…' : `Vérifier ${reminderPreview?.candidates.length || 0} rappel(s)` }}
          </button>
        </div>
      </div>

      <div class="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div>
          <div class="mb-3 flex items-center justify-between gap-3">
            <div><h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Prochaines relances</h3><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Avant échéance, jour J, puis relances mesurées à J+3, J+10 et J+20.</p></div>
            <strong class="font-display text-xl text-gray-950 dark:text-white">{{ reminderPreviewStatus === 'ready' ? (reminderPreview?.candidates.length || 0) : '—' }}</strong>
          </div>
          <div v-if="reminderPreviewStatus === 'loading'" role="status" class="grid min-h-28 place-items-center rounded-lg border border-gray-100 text-center dark:border-white/[0.08]"><div><span class="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /><p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Analyse des échéances…</p></div></div>
          <div v-else-if="reminderPreviewStatus === 'error'" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10"><p class="text-sm font-semibold text-rose-900 dark:text-rose-100">Analyse indisponible</p><p class="mt-1 text-xs text-rose-700 dark:text-rose-200">Les relances ne sont pas présentées tant que les données ne sont pas chargées.</p><button class="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white" @click="loadReminderPreview">Réessayer</button></div>
          <div v-else-if="reminderPreview?.candidates.length" class="divide-y divide-gray-100 rounded-lg border border-gray-100 dark:divide-white/[0.06] dark:border-white/[0.08]">
            <div v-for="candidate in reminderPreview.candidates.slice(0, 6)" :key="candidate.reminderKey" class="flex items-center gap-3 px-3 py-2.5">
              <span class="shrink-0 rounded-md px-2 py-1 text-xs font-semibold" :class="candidate.urgency === 'overdue' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : candidate.urgency === 'due' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300'">{{ urgencyLabel(candidate.urgency) }}</span>
              <div class="min-w-0 flex-1"><p class="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">{{ candidate.clientName }} · {{ candidate.number }}</p><p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{{ candidate.email }} · échéance {{ candidate.dueDate }}<template v-if="candidate.targetType === 'invoice'"> · solde {{ reminderMoney(candidate.balanceCents, candidate.currency) }}</template></p></div>
            </div>
          </div>
          <div v-else class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center dark:border-white/[0.1]"><p class="text-sm font-medium text-gray-800 dark:text-gray-100">Aucune relance à envoyer</p><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Le moteur surveille les prochaines échéances.</p></div>
          <p v-if="reminderPreviewStatus === 'ready' && reminderPreview" class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ reminderPreview.skipped.alreadySent }} déjà envoyée(s) · {{ reminderPreview.skipped.missingContact }} sans adresse · {{ reminderPreview.skipped.paused }} suspendue(s) · {{ reminderPreview.skipped.outsideMilestone }} hors jalon</p>
        </div>
        <div>
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Historique récent</h3>
        <div v-if="reminderRunsStatus === 'loading'" role="status" class="rounded-lg border border-gray-100 px-4 py-6 text-center text-xs text-gray-500 dark:border-white/[0.08] dark:text-gray-400">Chargement de l’historique…</div>
        <div v-else-if="reminderRunsStatus === 'error'" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-4 dark:border-rose-500/20 dark:bg-rose-500/10">
          <p class="text-xs font-semibold text-rose-800 dark:text-rose-200">Historique indisponible</p>
          <button class="mt-2 min-h-11 rounded-lg bg-rose-700 px-3 text-xs font-semibold text-white" @click="loadReminderRuns">Réessayer</button>
        </div>
        <div v-else-if="reminderRuns.length" class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="run in reminderRuns.slice(0, 6)"
            :key="run.id"
            class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]"
          >
            <p class="truncate text-xs font-semibold text-gray-700 dark:text-gray-200">
              <template v-if="run.action === 'pipeline_reminder_run'">
                {{ run.payload?.sentCount || 0 }} envoyé(s), {{ run.payload?.skippedCount || 0 }} ignoré(s), {{ run.payload?.failedCount || 0 }} échec(s)
              </template>
              <template v-else>
                {{ run.payload?.targetType || 'email' }} {{ run.payload?.number || '' }}
              </template>
            </p>
            <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{{ new Date(run.created_at).toLocaleString('fr-CH') }}</p>
          </div>
        </div>
          <p v-else class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-500 dark:border-white/[0.1] dark:text-gray-400">Aucun historique disponible.</p>
        </div>
      </div>
    </section>
    </div>

    <Transition name="fade">
      <div v-if="showDiagnostics" class="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 sm:p-6" @click.self="closeDiagnostics">
        <div ref="diagnosticsDialogRef" role="dialog" aria-modal="true" aria-labelledby="diagnostics-title" tabindex="-1" class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-white/[0.1] dark:bg-[#151522] sm:p-5" @keydown="handleDiagnosticsDialogKeydown">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="diagnostics-title" class="font-display text-xl font-semibold text-gray-950 dark:text-white">État des données</h2>
              <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{{ readySourceCount }} source(s) sur {{ dashboardSourceItems.length }} sont à jour pour {{ currentOrganizationName }}.</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Dernière vérification complète : {{ lastUpdatedLabel }}.</p>
            </div>
            <button data-diagnostics-close class="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]" aria-label="Fermer l’état des données" @click="closeDiagnostics">×</button>
          </div>

          <div class="mt-5 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-white/[0.06] dark:border-white/[0.1]">
            <div v-for="source in dashboardSourceItems" :key="source.key" class="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-sm font-semibold capitalize text-gray-950 dark:text-white">{{ source.label }}</p>
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="source.status === 'ready' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : source.status === 'error' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'">{{ sourceStatusLabel(source.status) }}</span>
                </div>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ source.description }}</p>
                <p v-if="source.error" class="mt-1 text-xs text-rose-700 dark:text-rose-300">{{ source.error }}</p>
              </div>
              <button type="button" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]" :disabled="Boolean(retryingSource)" @click="retrySource(source.key)">
                <AdminAdminIcon icon="refresh-cw" class="h-3.5 w-3.5" />
                {{ retryingSource === source.key ? 'Actualisation…' : 'Actualiser' }}
              </button>
            </div>
          </div>

          <div class="mt-5 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs text-gray-500 dark:text-gray-400">Une erreur locale n’efface jamais les dernières données fiables.</p>
            <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950" @click="loadDashboard(true)">
              <AdminAdminIcon icon="refresh-cw" class="h-4 w-4" />
              Tout actualiser
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showDashboardSettings" class="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 sm:p-6" @click.self="closeDashboardSettings">
        <div ref="settingsDialogRef" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabindex="-1" class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-white/[0.1] dark:bg-[#151522] sm:p-5" @keydown="handleSettingsDialogKeydown">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="settings-title" class="font-display text-xl font-semibold text-gray-950 dark:text-white">Personnaliser le tableau de bord</h2>
              <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">Choisis ce qui mérite ton attention et place les blocs dans ton ordre de travail.</p>
            </div>
            <button data-settings-close class="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]" aria-label="Fermer la personnalisation" @click="closeDashboardSettings">×</button>
          </div>

          <div class="mt-5 space-y-2">
            <div v-for="(section, index) in dashboardSections" :key="section.id" class="rounded-xl border border-gray-200 px-3 py-3 dark:border-white/[0.1] sm:px-4">
              <div class="flex items-start gap-3">
                <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <input type="checkbox" class="mt-1 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500" :checked="section.visible" :disabled="section.visible && visibleSectionCount === 1" @change="toggleSection(section.id)">
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-gray-950 dark:text-white">{{ section.label }}</span>
                    <span class="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">{{ section.description }}</span>
                  </span>
                </label>
                <div class="flex shrink-0 gap-1">
                  <button type="button" class="min-h-11 rounded-lg border border-gray-200 px-2 text-xs font-semibold text-gray-600 disabled:opacity-30 dark:border-white/[0.1] dark:text-gray-300" :disabled="index === 0" :aria-label="`Monter ${section.label}`" @click="moveSection(section.id, -1)">Monter</button>
                  <button type="button" class="min-h-11 rounded-lg border border-gray-200 px-2 text-xs font-semibold text-gray-600 disabled:opacity-30 dark:border-white/[0.1] dark:text-gray-300" :disabled="index === dashboardSections.length - 1" :aria-label="`Descendre ${section.label}`" @click="moveSection(section.id, 1)">Descendre</button>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-5 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
            <button type="button" class="min-h-11 rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]" @click="resetDashboardPreferences">Réinitialiser</button>
            <button type="button" class="min-h-11 rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950" @click="closeDashboardSettings">Terminer</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showHelp" class="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 sm:p-6" @click.self="closeHelp">
        <div ref="helpDialogRef" role="dialog" aria-modal="true" aria-labelledby="help-title" tabindex="-1" class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-white/[0.1] dark:bg-[#151522] sm:p-5" @keydown="handleHelpDialogKeydown">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="help-title" class="font-display text-xl font-semibold text-gray-950 dark:text-white">Aide et prise en main</h2>
              <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">Retrouve les prochaines étapes utiles et les raccourcis du cockpit.</p>
            </div>
            <button data-help-close class="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]" aria-label="Fermer l’aide" @click="closeHelp">×</button>
          </div>

          <section class="mt-5" aria-labelledby="setup-title">
            <div class="flex items-end justify-between gap-3">
              <div>
                <h3 id="setup-title" class="text-sm font-semibold text-gray-950 dark:text-white">Démarrage rapide</h3>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ onboardingCompletedCount }} étape(s) terminée(s) sur {{ onboardingSteps.length }}.</p>
              </div>
              <strong class="text-sm text-violet-700 dark:text-violet-300">{{ Math.round((onboardingCompletedCount / onboardingSteps.length) * 100) }} %</strong>
            </div>
            <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]" aria-hidden="true"><div class="h-full rounded-full bg-violet-600 transition-[width] duration-300" :style="{ width: `${(onboardingCompletedCount / onboardingSteps.length) * 100}%` }" /></div>
            <div class="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-white/[0.06] dark:border-white/[0.1]">
              <NuxtLink v-for="step in onboardingSteps" :key="step.label" :to="step.to" class="flex min-h-14 items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03]" @click="closeHelp">
                <span v-if="step.complete" class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <AdminAdminIcon icon="check-square" class="h-3.5 w-3.5" />
                </span>
                <span v-else class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/[0.07] dark:text-gray-300">
                  <AdminAdminIcon icon="activity" class="h-3.5 w-3.5" />
                </span>
                <span class="min-w-0 flex-1"><span class="block text-sm font-semibold text-gray-950 dark:text-white">{{ step.label }}</span><span class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{{ step.description }}</span></span>
                <span class="text-xs font-semibold text-violet-700 dark:text-violet-300">{{ step.complete ? 'Ouvrir' : 'Commencer' }}</span>
              </NuxtLink>
            </div>
            <NuxtLink v-if="nextOnboardingStep" :to="nextOnboardingStep.to" class="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950" @click="closeHelp">Continuer : {{ nextOnboardingStep.label }}</NuxtLink>
          </section>

          <section class="mt-6 grid gap-4 sm:grid-cols-2" aria-label="Aide complémentaire">
            <div>
              <h3 class="text-sm font-semibold text-gray-950 dark:text-white">Raccourcis clavier</h3>
              <dl class="mt-3 space-y-2 text-xs">
                <div class="flex items-center justify-between gap-3"><dt class="text-gray-600 dark:text-gray-300">Recherche globale</dt><dd><kbd class="rounded border border-gray-200 bg-gray-50 px-2 py-1 font-semibold text-gray-700 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-200">⌘/Ctrl K</kbd></dd></div>
                <div class="flex items-center justify-between gap-3"><dt class="text-gray-600 dark:text-gray-300">Aller aux tâches</dt><dd><kbd class="rounded border border-gray-200 bg-gray-50 px-2 py-1 font-semibold text-gray-700 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-200">G puis T</kbd></dd></div>
                <div class="flex items-center justify-between gap-3"><dt class="text-gray-600 dark:text-gray-300">Aller aux devis</dt><dd><kbd class="rounded border border-gray-200 bg-gray-50 px-2 py-1 font-semibold text-gray-700 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-200">G puis D</kbd></dd></div>
                <div class="flex items-center justify-between gap-3"><dt class="text-gray-600 dark:text-gray-300">Nouvelle facture</dt><dd><kbd class="rounded border border-gray-200 bg-gray-50 px-2 py-1 font-semibold text-gray-700 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-200">N puis F</kbd></dd></div>
              </dl>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-950 dark:text-white">Comprendre le cockpit</h3>
              <div class="mt-3 space-y-2 text-xs">
                <details class="rounded-lg border border-gray-200 px-3 py-2 dark:border-white/[0.1]"><summary class="cursor-pointer font-semibold text-gray-800 dark:text-gray-100">Montants à encaisser</summary><p class="mt-2 leading-5 text-gray-600 dark:text-gray-300">Le total additionne uniquement les soldes restant dus dans les 30 prochains jours, séparés par devise.</p></details>
                <details class="rounded-lg border border-gray-200 px-3 py-2 dark:border-white/[0.1]"><summary class="cursor-pointer font-semibold text-gray-800 dark:text-gray-100">Relances clients</summary><p class="mt-2 leading-5 text-gray-600 dark:text-gray-300">Aucun message n’est envoyé sans sélection et confirmation. Si son contenu ou son destinataire change, le serveur bloque l’envoi.</p></details>
                <details class="rounded-lg border border-gray-200 px-3 py-2 dark:border-white/[0.1]"><summary class="cursor-pointer font-semibold text-gray-800 dark:text-gray-100">Données partielles</summary><p class="mt-2 leading-5 text-gray-600 dark:text-gray-300">Une valeur masquée signifie qu’une source n’a pas répondu. Ouvre « État détaillé » pour actualiser uniquement cette source.</p></details>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showTaskPlan" class="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 sm:p-6" @click.self="closeTaskPlan">
        <div ref="taskPlanDialogRef" role="dialog" aria-modal="true" aria-labelledby="task-plan-title" tabindex="-1" class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-white/[0.1] dark:bg-[#151522] sm:p-5" @keydown="handleTaskPlanDialogKeydown">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="task-plan-title" class="font-display text-xl font-semibold text-gray-950 dark:text-white">Préparer les tâches commerciales</h2>
              <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">Vérifie les suggestions avant de les ajouter. Aucun email n’est envoyé depuis cette étape.</p>
            </div>
            <button data-task-plan-close class="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]" aria-label="Fermer la préparation" @click="closeTaskPlan">×</button>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs text-gray-500 dark:text-gray-400">Sélectionne uniquement les suivis que tu veux ajouter aujourd’hui.</p>
            <button type="button" class="min-h-11 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 dark:border-white/[0.12] dark:text-gray-200" @click="selectedTaskSuggestionKeys = commercialTaskSuggestions.map(suggestion => suggestion.key)">Tout sélectionner</button>
          </div>

          <div class="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-white/[0.06] dark:border-white/[0.1]">
            <label v-for="suggestion in commercialTaskSuggestions" :key="suggestion.key" class="flex min-h-16 cursor-pointer items-start gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] sm:px-4">
              <input type="checkbox" class="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500" :checked="selectedTaskSuggestionKeys.includes(suggestion.key)" @change="toggleTaskSuggestion(suggestion.key)">
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-gray-950 dark:text-white">{{ taskSuggestionSource(suggestion) }}</span>
                  <span class="rounded-md px-2 py-0.5 text-xs font-semibold" :class="suggestion.priority === 'high' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'">{{ suggestion.label }}</span>
                </span>
                <span class="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">{{ suggestion.reason }} · échéance {{ suggestion.dueDate }}</span>
              </span>
            </label>
          </div>

          <div class="mt-5 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ selectedTaskSuggestions.length }} tâche(s) sélectionnée(s) sur {{ commercialTaskSuggestions.length }}</p>
            <div class="flex gap-2">
              <button data-task-plan-cancel class="min-h-11 flex-1 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 dark:border-white/[0.12] dark:text-gray-200 sm:flex-none" @click="closeTaskPlan">Annuler</button>
              <button class="min-h-11 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none" :disabled="runningAutomation || !selectedTaskSuggestions.length" @click="confirmTaskGeneration">
                {{ runningAutomation ? 'Création…' : `Ajouter (${selectedTaskSuggestions.length})` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showReminderConfirm" class="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 sm:p-6" @click.self="closeReminderConfirm">
        <div ref="reminderDialogRef" role="dialog" aria-modal="true" aria-labelledby="reminder-confirm-title" tabindex="-1" class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-white/[0.1] dark:bg-[#151522] sm:p-5" @keydown="handleReminderDialogKeydown">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="reminder-confirm-title" class="font-display text-xl font-semibold text-gray-950 dark:text-white">Vérifier les relances</h2>
              <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">Sélectionne précisément les messages à envoyer. L’envoi est définitif et contacte directement les clients.</p>
            </div>
            <button class="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]" aria-label="Fermer la vérification" @click="closeReminderConfirm">×</button>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs text-gray-500 dark:text-gray-400">Aucun message n’est sélectionné par défaut.</p>
            <button type="button" class="min-h-11 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 dark:border-white/[0.12] dark:text-gray-200" @click="selectedReminderKeys = reminderPreview?.candidates.map(candidate => candidate.reminderKey) || []">Tout sélectionner</button>
          </div>
          <div class="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-white/[0.06] dark:border-white/[0.1]">
            <div v-for="candidate in reminderPreview?.candidates || []" :key="candidate.reminderKey" class="px-3 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] sm:px-4">
              <label class="flex cursor-pointer items-start gap-3">
                <input type="checkbox" class="mt-1 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500" :checked="selectedReminderKeys.includes(candidate.reminderKey)" @change="toggleReminder(candidate.reminderKey)">
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-semibold text-gray-950 dark:text-white">{{ candidate.clientName }} · {{ candidate.email }}</span>
                  <span class="mt-1 block text-xs text-gray-600 dark:text-gray-300">Objet : {{ candidate.subject }}</span>
                  <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">{{ candidate.number }} · échéance {{ candidate.dueDate }}</span>
                </span>
              </label>
              <details class="ml-8 mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-white/[0.04]">
                <summary class="cursor-pointer font-semibold text-gray-700 dark:text-gray-200">Lire le message complet</summary>
                <p class="mt-3 whitespace-pre-line leading-5 text-gray-600 dark:text-gray-300">{{ candidate.bodyText }}</p>
              </details>
            </div>
          </div>

          <div class="mt-5 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ selectedReminderCandidates.length }} message(s) sélectionné(s) sur {{ reminderPreview?.candidates.length || 0 }}</p>
            <div class="flex gap-2">
              <button data-reminder-cancel class="min-h-11 flex-1 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 dark:border-white/[0.12] dark:text-gray-200 sm:flex-none" @click="closeReminderConfirm">Annuler</button>
              <button class="min-h-11 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none" :disabled="runningEmailReminders || !selectedReminderCandidates.length" @click="sendReminderEmails">
                {{ runningEmailReminders ? 'Envoi en cours…' : `Confirmer l’envoi (${selectedReminderCandidates.length})` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
