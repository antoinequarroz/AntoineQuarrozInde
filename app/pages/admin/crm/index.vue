<script setup lang="ts">
import type { Client } from '~/types'
import AdminAdminIcon from '~/components/admin/AdminIcon.vue'
import AdminAdminEmptyState from '~/components/admin/AdminEmptyState.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useClientsStore()
const projectsStore = useProjectsStore()
const quotesStore = useQuotesStore()
const invoicesStore = useInvoicesStore()
const tasksStore = useTasksStore()
const toast = useToast()

const tab = ref<'pipeline' | 'contacts' | 'prospects'>('pipeline')
const search = ref('')
const viewMode = ref<'cards' | 'table'>('cards')
const statusFilter = ref<'all' | Client['status']>('all')
const sortBy = ref<'recent' | 'name'>('recent')

const AVATAR_TONES = [
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-indigo-500',
]

function avatarTone(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_TONES.length
  return AVATAR_TONES[hash]
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?'
}

const STATUS_TONE: Record<Client['status'], string> = {
  lead: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  inactive: 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400',
}

const STATUS_LABEL: Record<Client['status'], string> = {
  lead: 'Prospect',
  active: 'Client actif',
  inactive: 'Inactif',
}

const searchedContacts = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = store.clients
  if (!q) return list
  return list.filter(client =>
    client.name.toLowerCase().includes(q)
    || (client.company || '').toLowerCase().includes(q)
    || client.email.toLowerCase().includes(q),
  )
})

function sortClients(list: Client[]) {
  const sorted = list.slice()
  if (sortBy.value === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name))
  } else {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return sorted
}

const filteredContacts = computed(() => {
  const byStatus = statusFilter.value === 'all'
    ? searchedContacts.value
    : searchedContacts.value.filter(client => client.status === statusFilter.value)
  return sortClients(byStatus)
})

function leadScore(client: Client): number | null {
  const match = client.notes?.match(/score\s*[:=]?\s*(\d{1,3})/i)
  if (!match) return null
  return Math.min(Number(match[1]), 100)
}

function leadPlace(client: Client): string | null {
  const match = client.notes?.match(/\s[aà]\s+([A-ZÀ-Þ][^,]*?),/)
  return match?.[1] ? match[1].trim() : null
}

function scorePriority(score: number | null) {
  if (score === null) return { label: 'Non score', chip: 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400' }
  if (score >= 80) return { label: `Priorite haute · ${score}`, chip: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' }
  if (score >= 60) return { label: `Bon prospect · ${score}`, chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' }
  if (score >= 40) return { label: `A qualifier · ${score}`, chip: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' }
  return { label: `Faible priorite · ${score}`, chip: 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400' }
}

const prospects = computed(() =>
  searchedContacts.value
    .filter(client => client.status === 'lead')
    .slice()
    .sort((a, b) => (leadScore(b) ?? -1) - (leadScore(a) ?? -1)),
)

const stats = computed(() => {
  const total = store.clients.length
  const leads = store.clients.filter(c => c.status === 'lead').length
  const active = store.clients.filter(c => c.status === 'active').length
  const conversion = total ? Math.round((active / total) * 100) : 0
  return { total, leads, active, conversion }
})

const PIPELINE_STAGES = [
  { id: 'lead', label: 'Prospects', tone: 'bg-amber-500' },
  { id: 'client', label: 'Clients', tone: 'bg-cyan-500' },
  { id: 'project', label: 'Projets', tone: 'bg-violet-500' },
  { id: 'quote', label: 'Devis', tone: 'bg-fuchsia-500' },
  { id: 'invoice', label: 'Factures', tone: 'bg-sky-500' },
  { id: 'paid', label: 'Payés', tone: 'bg-emerald-500' },
] as const

type PipelineStage = typeof PIPELINE_STAGES[number]['id']

const pipelineClients = computed(() => {
  const now = new Date().toISOString().slice(0, 10)
  return store.clients.map((client) => {
    const projects = projectsStore.projects.filter(project => project.clientId === client.id)
    const quotes = quotesStore.quotes.filter(quote => quote.clientId === client.id)
    const invoices = invoicesStore.invoices.filter(invoice => invoice.clientId === client.id)
    const tasks = tasksStore.tasks
      .filter(task => task.clientId === client.id && task.status !== 'done')
      .sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')))
    const openInvoice = invoices.find(invoice => invoice.status === 'overdue')
      || invoices.find(invoice => invoice.status === 'sent')
      || invoices.find(invoice => invoice.status === 'draft')
    const paidInvoice = invoices.find(invoice => invoice.status === 'paid')
    const activeQuote = quotes.find(quote => quote.status === 'sent')
      || quotes.find(quote => quote.status === 'accepted')
      || quotes.find(quote => quote.status === 'draft')

    let stage: PipelineStage = client.status === 'lead' ? 'lead' : 'client'
    let action = client.status === 'lead' ? 'Qualifier le besoin' : 'Créer un projet'
    let to = `/admin/clients/${client.id}`
    let dueDate: string | null = tasks[0]?.dueDate || null

    if (projects.length) {
      stage = 'project'
      action = tasks[0]?.title || 'Continuer le projet'
      to = '/admin/projects'
    }
    if (activeQuote) {
      stage = 'quote'
      action = activeQuote.status === 'draft' ? `Finaliser ${activeQuote.number}` : `Suivre ${activeQuote.number}`
      dueDate = activeQuote.validUntil || dueDate
      to = '/admin/quotes'
    }
    if (openInvoice) {
      stage = 'invoice'
      action = openInvoice.status === 'overdue' || (openInvoice.dueAt && openInvoice.dueAt < now)
        ? `Relancer ${openInvoice.number}`
        : `Suivre ${openInvoice.number}`
      dueDate = openInvoice.dueAt || dueDate
      to = '/admin/invoices'
    } else if (paidInvoice) {
      stage = 'paid'
      action = 'Préparer le suivi client'
      dueDate = paidInvoice.paidAt || dueDate
      to = `/admin/clients/${client.id}`
    }
    return { client, stage, action, to, dueDate }
  })
})

const pipelineColumns = computed(() => PIPELINE_STAGES.map(stage => ({
  ...stage,
  items: pipelineClients.value.filter(item => item.stage === stage.id),
})))

function formatPipelineDate(value: string | null) {
  if (!value) return 'Sans échéance'
  return new Intl.DateTimeFormat('fr-CH', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`))
}

async function markStatus(client: Client, status: Client['status']) {
  try {
    await store.update(client.id, { status })
    toast.success(`${client.name} marque comme ${STATUS_LABEL[status].toLowerCase()}`)
  } catch {
    toast.error('Erreur de mise a jour')
  }
}

onMounted(async () => {
  await Promise.all([
    store.ensureLoaded(),
    projectsStore.ensureLoaded(),
    quotesStore.ensureLoaded(),
    invoicesStore.ensureLoaded(),
    tasksStore.ensureLoaded(),
  ])
})
</script>

<template>
  <div class="space-y-5">
    <section class="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0">
          <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
            CRM
          </span>
          <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">
            Carnet d'adresses & prospection
          </h1>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Tout ton reseau au meme endroit : contacts, clients actifs et prospects a transformer.
          </p>
        </div>
        <NuxtLink to="/admin/clients" class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/[0.12] dark:text-gray-200 dark:hover:bg-white/[0.04]">
          <AdminAdminIcon icon="users" class="h-4 w-4" />
          Vue kanban clients
        </NuxtLink>
      </div>
    </section>

    <section class="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
      <div class="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:p-4">
        <span class="absolute inset-x-0 top-0 h-1 bg-violet-500" />
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Contacts</p>
        <p class="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">{{ stats.total }}</p>
      </div>
      <div class="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:p-4">
        <span class="absolute inset-x-0 top-0 h-1 bg-amber-500" />
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Prospects</p>
        <p class="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">{{ stats.leads }}</p>
      </div>
      <div class="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:p-4">
        <span class="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Clients actifs</p>
        <p class="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">{{ stats.active }}</p>
      </div>
      <div class="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:p-4">
        <span class="absolute inset-x-0 top-0 h-1 bg-sky-500" />
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Taux de conversion</p>
        <p class="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">{{ stats.conversion }}%</p>
      </div>
    </section>

    <section class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:p-3.5">
      <div class="flex flex-wrap items-center gap-2.5">
        <div class="inline-flex shrink-0 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.06]">
          <button
            class="rounded-md px-3 py-1.5 text-xs font-semibold transition"
            :class="tab === 'pipeline' ? 'bg-gradient-brand text-white shadow-glow-sm' : 'text-gray-500 dark:text-gray-400'"
            @click="tab = 'pipeline'"
          >
            Pipeline
          </button>
          <button
            class="rounded-md px-3 py-1.5 text-xs font-semibold transition"
            :class="tab === 'contacts' ? 'bg-gradient-brand text-white shadow-glow-sm' : 'text-gray-500 dark:text-gray-400'"
            @click="tab = 'contacts'"
          >
            Carnet d'adresses
          </button>
          <button
            class="rounded-md px-3 py-1.5 text-xs font-semibold transition"
            :class="tab === 'prospects' ? 'bg-gradient-brand text-white shadow-glow-sm' : 'text-gray-500 dark:text-gray-400'"
            @click="tab = 'prospects'"
          >
            Prospects ({{ stats.leads }})
          </button>
        </div>

        <div class="hidden h-6 w-px shrink-0 bg-gray-200 dark:bg-white/[0.08] sm:block" />

        <input
          v-if="tab !== 'pipeline'"
          v-model="search"
          type="text"
          class="input-field min-w-[180px] flex-1 sm:max-w-xs"
          placeholder="Rechercher nom, societe, email..."
        >

        <select v-if="tab === 'contacts'" v-model="statusFilter" class="input-field w-auto shrink-0">
          <option value="all">Tous statuts</option>
          <option value="lead">Prospect</option>
          <option value="active">Client actif</option>
          <option value="inactive">Inactif</option>
        </select>

        <select v-if="tab !== 'pipeline'" v-model="sortBy" class="input-field w-auto shrink-0">
          <option value="recent">Plus recents</option>
          <option value="name">Nom (A-Z)</option>
        </select>

        <div v-if="tab !== 'pipeline'" class="inline-flex shrink-0 rounded-lg border border-gray-200 p-1 dark:border-white/[0.12] sm:ml-auto">
          <button
            class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition"
            :class="viewMode === 'cards' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
            @click="viewMode = 'cards'"
          >
            <AdminAdminIcon icon="grid" class="h-3.5 w-3.5" />
            Cartes
          </button>
          <button
            class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition"
            :class="viewMode === 'table' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
            @click="viewMode = 'table'"
          >
            <AdminAdminIcon icon="file-text" class="h-3.5 w-3.5" />
            Tableau
          </button>
        </div>
      </div>
    </section>

    <section v-if="tab === 'pipeline'" aria-labelledby="pipeline-title">
      <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="pipeline-title" class="font-display text-xl font-semibold text-gray-950 dark:text-white">Du premier contact au paiement</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Chaque fiche montre la prochaine action utile, sans dupliquer les données du client.</p>
        </div>
        <span class="text-xs font-medium text-gray-400">{{ pipelineClients.length }} relation{{ pipelineClients.length > 1 ? 's' : '' }}</span>
      </div>
      <div class="admin-scrollbar overflow-x-auto pb-3">
        <div class="grid min-w-[1320px] grid-cols-6 gap-3">
          <div v-for="column in pipelineColumns" :key="column.id" class="min-w-0 rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 dark:border-white/[0.08] dark:bg-white/[0.025]">
            <div class="mb-3 flex items-center justify-between gap-2 px-1">
              <div class="flex min-w-0 items-center gap-2">
                <span class="h-2 w-2 shrink-0 rounded-full" :class="column.tone" />
                <h3 class="truncate text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">{{ column.label }}</h3>
              </div>
              <span class="rounded-md bg-white px-1.5 py-0.5 text-xs font-semibold text-gray-500 shadow-sm dark:bg-white/[0.07] dark:text-gray-300">{{ column.items.length }}</span>
            </div>
            <div class="space-y-2">
              <NuxtLink v-for="item in column.items" :key="item.client.id" :to="item.to" class="group block rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-white/[0.08] dark:bg-[#111118] dark:hover:border-violet-500/40">
                <div class="flex items-start gap-2.5">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" :class="avatarTone(item.client.name)">{{ initials(item.client.name) }}</span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-gray-950 dark:text-white">{{ item.client.name }}</p>
                    <p class="truncate text-xs text-gray-400">{{ item.client.company || 'Indépendant' }}</p>
                  </div>
                </div>
                <p class="mt-3 line-clamp-2 text-xs font-medium text-gray-700 dark:text-gray-200">{{ item.action }}</p>
                <p class="mt-1 text-xs" :class="item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10) ? 'text-rose-600 dark:text-rose-300' : 'text-gray-400'">{{ formatPipelineDate(item.dueDate) }}</p>
              </NuxtLink>
              <div v-if="!column.items.length" class="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-400 dark:border-white/[0.08]">Aucun dossier</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="tab === 'contacts' && viewMode === 'cards'" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <NuxtLink
        v-for="client in filteredContacts"
        :key="client.id"
        :to="`/admin/clients/${client.id}`"
        class="group rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-white/[0.08] dark:bg-[#111118] dark:hover:border-violet-500/30"
      >
        <div class="flex items-start gap-3">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold text-white" :class="avatarTone(client.name)">
            {{ initials(client.name) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-gray-950 dark:text-white">{{ client.name }}</p>
            <p class="truncate text-xs text-gray-400">{{ client.company || 'Independant' }}</p>
          </div>
          <span class="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold" :class="STATUS_TONE[client.status]">
            {{ STATUS_LABEL[client.status] }}
          </span>
        </div>
        <div class="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-white/[0.06] dark:text-gray-400">
          <a :href="`mailto:${client.email}`" class="flex items-center gap-1.5 hover:text-violet-600 dark:hover:text-violet-400" @click.stop>
            <AdminAdminIcon icon="mail" class="h-3.5 w-3.5" />
            <span class="truncate">{{ client.email }}</span>
          </a>
          <a v-if="client.phone" :href="`tel:${client.phone}`" class="flex items-center gap-1.5 hover:text-violet-600 dark:hover:text-violet-400" @click.stop>
            <AdminAdminIcon icon="phone" class="h-3.5 w-3.5" />
            <span>{{ client.phone }}</span>
          </a>
        </div>
        <p v-if="client.notes" class="mt-2 line-clamp-2 text-xs text-gray-400">{{ client.notes }}</p>
      </NuxtLink>

      <AdminAdminEmptyState
        v-if="!filteredContacts.length"
        title="Aucun contact"
        body="Ajoute un client ou ajuste ta recherche."
        class="sm:col-span-2 xl:col-span-3"
      />
    </section>

    <div v-if="tab === 'contacts' && viewMode === 'table'" class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <table class="w-full">
        <thead class="border-b border-gray-100 dark:border-white/[0.06]">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Nom</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 sm:table-cell">Societe</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 lg:table-cell">Lieu</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Statut</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 md:table-cell">Email</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 md:table-cell">Telephone</th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Fiche</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in filteredContacts" :key="client.id" class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-white/[0.03] dark:hover:bg-white/[0.02]">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2.5">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold text-white" :class="avatarTone(client.name)">
                  {{ initials(client.name) }}
                </span>
                <span class="truncate text-sm font-medium text-gray-950 dark:text-white">{{ client.name }}</span>
              </div>
            </td>
            <td class="hidden px-4 py-3 text-xs text-gray-500 dark:text-gray-400 sm:table-cell">{{ client.company || 'Independant' }}</td>
            <td class="hidden px-4 py-3 text-xs text-gray-500 dark:text-gray-400 lg:table-cell">
              <span v-if="leadPlace(client)" class="inline-flex items-center gap-1">
                <AdminAdminIcon icon="map-pin" class="h-3.5 w-3.5 text-gray-400" />
                {{ leadPlace(client) }}
              </span>
              <span v-else>—</span>
            </td>
            <td class="px-4 py-3">
              <span class="rounded-md px-2 py-0.5 text-xs font-semibold" :class="STATUS_TONE[client.status]">{{ STATUS_LABEL[client.status] }}</span>
            </td>
            <td class="hidden px-4 py-3 text-xs text-gray-500 dark:text-gray-400 md:table-cell">
              <a :href="`mailto:${client.email}`" class="hover:text-violet-600 dark:hover:text-violet-400">{{ client.email }}</a>
            </td>
            <td class="hidden px-4 py-3 text-xs text-gray-500 dark:text-gray-400 md:table-cell">
              <a v-if="client.phone" :href="`tel:${client.phone}`" class="hover:text-violet-600 dark:hover:text-violet-400">{{ client.phone }}</a>
              <span v-else>-</span>
            </td>
            <td class="px-4 py-3 text-right">
              <NuxtLink :to="`/admin/clients/${client.id}`" class="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">Voir</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
      <AdminAdminEmptyState
        v-if="!filteredContacts.length"
        title="Aucun contact"
        body="Ajuste ta recherche ou tes filtres."
        class="border-t border-gray-100 dark:border-white/[0.06]"
      />
    </div>

    <section v-if="tab === 'prospects' && viewMode === 'cards'" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="client in prospects"
        :key="client.id"
        class="rounded-lg border border-amber-200/60 bg-amber-50/40 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/[0.04]"
      >
        <div class="flex items-start gap-3">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold text-white" :class="avatarTone(client.name)">
            {{ initials(client.name) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-gray-950 dark:text-white">{{ client.name }}</p>
            <p class="truncate text-xs text-gray-400">{{ client.company || 'Independant' }}</p>
          </div>
          <span class="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold" :class="scorePriority(leadScore(client)).chip">
            {{ scorePriority(leadScore(client)).label }}
          </span>
        </div>
        <div class="mt-3 space-y-1.5 border-t border-amber-200/60 pt-3 text-xs text-gray-600 dark:border-amber-500/20 dark:text-gray-300">
          <a :href="`mailto:${client.email}`" class="flex items-center gap-1.5 hover:text-violet-600 dark:hover:text-violet-400">
            <AdminAdminIcon icon="mail" class="h-3.5 w-3.5" />
            <span class="truncate">{{ client.email }}</span>
          </a>
          <a v-if="client.phone" :href="`tel:${client.phone}`" class="flex items-center gap-1.5 hover:text-violet-600 dark:hover:text-violet-400">
            <AdminAdminIcon icon="phone" class="h-3.5 w-3.5" />
            <span>{{ client.phone }}</span>
          </a>
        </div>
        <p v-if="client.notes" class="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{{ client.notes }}</p>
        <div class="mt-3 flex items-center gap-2">
          <button
            class="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white transition hover:bg-emerald-700"
            @click="markStatus(client, 'active')"
          >
            <AdminAdminIcon icon="check-square" class="h-3.5 w-3.5" />
            Convertir en client
          </button>
          <NuxtLink :to="`/admin/clients/${client.id}`" class="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 px-2.5 text-xs font-semibold text-gray-600 transition hover:bg-white dark:border-white/[0.12] dark:text-gray-300 dark:hover:bg-white/[0.04]">
            Fiche
          </NuxtLink>
        </div>
      </div>

      <AdminAdminEmptyState
        v-if="!prospects.length"
        title="Aucun prospect"
        body="Les nouveaux leads qualifies depuis les messages apparaitront ici."
        class="sm:col-span-2 xl:col-span-3"
      />
    </section>

    <div v-if="tab === 'prospects' && viewMode === 'table'" class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <table class="w-full">
        <thead class="border-b border-gray-100 dark:border-white/[0.06]">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Nom</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 sm:table-cell">Societe</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 lg:table-cell">Lieu</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Priorite</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 md:table-cell">Email</th>
            <th class="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 md:table-cell">Telephone</th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in prospects" :key="client.id" class="border-b border-gray-50 last:border-0 hover:bg-amber-50/40 dark:border-white/[0.03] dark:hover:bg-amber-500/[0.04]">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2.5">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold text-white" :class="avatarTone(client.name)">
                  {{ initials(client.name) }}
                </span>
                <span class="truncate text-sm font-medium text-gray-950 dark:text-white">{{ client.name }}</span>
              </div>
            </td>
            <td class="hidden px-4 py-3 text-xs text-gray-500 dark:text-gray-400 sm:table-cell">{{ client.company || 'Independant' }}</td>
            <td class="hidden px-4 py-3 text-xs text-gray-500 dark:text-gray-400 lg:table-cell">
              <span v-if="leadPlace(client)" class="inline-flex items-center gap-1">
                <AdminAdminIcon icon="map-pin" class="h-3.5 w-3.5 text-gray-400" />
                {{ leadPlace(client) }}
              </span>
              <span v-else>—</span>
            </td>
            <td class="px-4 py-3">
              <span class="rounded-md px-2 py-0.5 text-xs font-semibold" :class="scorePriority(leadScore(client)).chip">{{ scorePriority(leadScore(client)).label }}</span>
            </td>
            <td class="hidden px-4 py-3 text-xs text-gray-500 dark:text-gray-400 md:table-cell">
              <a :href="`mailto:${client.email}`" class="hover:text-violet-600 dark:hover:text-violet-400">{{ client.email }}</a>
            </td>
            <td class="hidden px-4 py-3 text-xs text-gray-500 dark:text-gray-400 md:table-cell">
              <a v-if="client.phone" :href="`tel:${client.phone}`" class="hover:text-violet-600 dark:hover:text-violet-400">{{ client.phone }}</a>
              <span v-else>-</span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" @click="markStatus(client, 'active')">Convertir</button>
                <NuxtLink :to="`/admin/clients/${client.id}`" class="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400">Fiche</NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <AdminAdminEmptyState
        v-if="!prospects.length"
        title="Aucun prospect"
        body="Les nouveaux leads qualifies depuis les messages apparaitront ici."
        class="border-t border-gray-100 dark:border-white/[0.06]"
      />
    </div>
  </div>
</template>
