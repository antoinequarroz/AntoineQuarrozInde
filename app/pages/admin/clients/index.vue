<script setup lang="ts">
import type { Client } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useClientsStore()
const auth = useAuthStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()

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

const showForm = ref(false)
const closeForm = () => { showForm.value = false }
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(showForm, closeForm)
const editing = ref<Client | null>(null)
const selectedIds = ref<number[]>([])
const viewName = ref('')
const savedViews = ref<Array<{
  name: string
  q: string
  status: 'all' | Client['status']
  sort: 'created_at' | 'name' | 'email' | 'status'
  order: 'asc' | 'desc'
  pageSize: number
}>>([])

const form = reactive({
  name: '',
  company: '',
  email: '',
  phone: '',
  status: 'active' as Client['status'],
  notes: '',
  billingStreet: '',
  billingBuilding: '',
  billingPostalCode: '',
  billingCity: '',
  billingCountry: 'CH',
  acquisitionSource: '',
  acquisitionMedium: '',
  acquisitionCampaign: '',
})

const queryState = computed(() => {
  const qStatus = String(route.query.status || 'all')
  const qSort = String(route.query.sort || 'created_at')
  const qOrder = String(route.query.order || 'desc')
  const qPage = Math.max(Number(route.query.page) || 1, 1)
  const qPageSize = Math.min(Math.max(Number(route.query.pageSize) || 20, 1), 100)
  const qView = String(route.query.view || 'table')

  return {
    q: String(route.query.q || ''),
    status: (qStatus === 'lead' || qStatus === 'active' || qStatus === 'inactive' ? qStatus : 'all') as 'all' | Client['status'],
    sort: (qSort === 'name' || qSort === 'email' || qSort === 'status' ? qSort : 'created_at') as 'created_at' | 'name' | 'email' | 'status',
    order: (qOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
    page: qPage,
    pageSize: qPageSize,
    view: (qView === 'kanban' ? 'kanban' : 'table') as 'table' | 'kanban',
  }
})

const pageData = ref<{ items: Client[], total: number, page: number, pageSize: number }>({
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
})
const loading = ref(false)
const savingClient = ref(false)
const inviteAfterCreate = ref(false)
const showPortalAccess = ref(false)
const portalClient = ref<Client | null>(null)
const portalAction = ref<'invite' | 'resend' | 'reset' | 'disable' | 'enable' | null>(null)
const closePortalAccess = () => { showPortalAccess.value = false }
const { dialogRef: portalDialogRef, handleDialogKeydown: handlePortalDialogKeydown } = useAccessibleDialog(showPortalAccess, closePortalAccess)

type PortalAccessStatus = 'not_invited' | 'invited' | 'active' | 'disabled'

function portalAccessStatus(client: Client): PortalAccessStatus {
  if (client.portalAccessDisabledAt) return 'disabled'
  if (client.portalActivatedAt) return 'active'
  if (client.portalUserId || client.portalInvitedAt) return 'invited'
  return 'not_invited'
}

const portalAccessLabels: Record<PortalAccessStatus, string> = {
  not_invited: 'Non invité',
  invited: 'Invitation envoyée',
  active: 'Accès actif',
  disabled: 'Accès suspendu',
}

function portalAccessTone(client: Client) {
  const status = portalAccessStatus(client)
  if (status === 'active') return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200'
  if (status === 'invited') return 'bg-violet-50 text-violet-800 dark:bg-violet-400/10 dark:text-violet-200'
  if (status === 'disabled') return 'bg-red-50 text-red-800 dark:bg-red-400/10 dark:text-red-200'
  return 'bg-gray-100 text-gray-600 dark:bg-white/[0.07] dark:text-gray-300'
}

function openPortalAccess(client: Client) {
  portalClient.value = client
  showPortalAccess.value = true
}

async function runPortalAction(client: Client, action: 'invite' | 'resend' | 'reset' | 'disable' | 'enable') {
  if (portalAction.value) return false
  portalAction.value = action
  try {
    await $fetch('/api/admin/clients/access', { method: 'POST', body: { clientId: client.id, action }, headers: auth.authHeader() })
    await loadClients()
    portalClient.value = pageData.value.items.find(item => item.id === client.id) || client
    const messages = {
      invite: `Invitation envoyée à ${client.email}`,
      resend: `Nouvel e-mail d’accès envoyé à ${client.email}`,
      reset: `Réinitialisation envoyée à ${client.email}`,
      disable: 'Accès portail suspendu',
      enable: 'Accès portail réactivé',
    }
    toast.success(messages[action])
    return true
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'La gestion de l’accès portail a échoué')
    return false
  }
  finally { portalAction.value = null }
}

function resetForm() {
  Object.assign(form, { name: '', company: '', email: '', phone: '', status: 'active', notes: '', billingStreet: '', billingBuilding: '', billingPostalCode: '', billingCity: '', billingCountry: 'CH', acquisitionSource: '', acquisitionMedium: '', acquisitionCampaign: '' })
  inviteAfterCreate.value = false
}

function openNew() {
  editing.value = null
  resetForm()
  showForm.value = true
}

function openEdit(client: Client) {
  editing.value = client
  Object.assign(form, {
    name: client.name,
    company: client.company || '',
    email: client.email,
    phone: client.phone || '',
    status: client.status,
    notes: client.notes || '',
    billingStreet: client.billingStreet || '',
    billingBuilding: client.billingBuilding || '',
    billingPostalCode: client.billingPostalCode || '',
    billingCity: client.billingCity || '',
    billingCountry: client.billingCountry || 'CH',
    acquisitionSource: client.acquisitionSource || '',
    acquisitionMedium: client.acquisitionMedium || '',
    acquisitionCampaign: client.acquisitionCampaign || '',
  })
  showForm.value = true
}

async function replaceQuery(patch: Record<string, any>) {
  const nextQuery = { ...route.query, ...patch }
  Object.keys(nextQuery).forEach((key) => {
    const value = nextQuery[key]
    if (value === '' || value === null || value === undefined || value === false) {
      delete nextQuery[key]
    }
  })
  await router.replace({ query: nextQuery })
}

async function updateFilters(patch: Record<string, any>) {
  await replaceQuery({ ...patch, page: 1 })
}

async function loadViews() {
  try {
    savedViews.value = await $fetch('/api/admin/clients/views', {
      query: { resource: 'clients' },
      headers: auth.authHeader(),
    })
  } catch {
    savedViews.value = []
  }
}

async function saveCurrentView() {
  const name = viewName.value.trim()
  if (!name) return

  try {
    await $fetch('/api/admin/clients/views', {
      method: 'POST',
      headers: auth.authHeader(),
      body: {
        resource: 'clients',
        name,
        payload: {
          q: queryState.value.q,
          status: queryState.value.status,
          sort: queryState.value.sort,
          order: queryState.value.order,
          pageSize: queryState.value.pageSize,
        },
      },
    })
    viewName.value = ''
    await loadViews()
    toast.success('Vue sauvegardée')
  } catch {
    toast.error('Erreur sauvegarde vue')
  }
}

async function applyView(view: typeof savedViews.value[number]) {
  await router.replace({
    query: {
      ...route.query,
      q: view.q || undefined,
      status: view.status === 'all' ? undefined : view.status,
      sort: view.sort,
      order: view.order,
      pageSize: String(view.pageSize || 20),
      page: '1',
    },
  })
}

async function removeView(name: string) {
  try {
    await $fetch('/api/admin/clients/views', {
      method: 'DELETE',
      query: { resource: 'clients', name },
      headers: auth.authHeader(),
    })
    await loadViews()
  } catch {
    toast.error('Erreur suppression vue')
  }
}

async function loadClients() {
  loading.value = true
  try {
    pageData.value = await $fetch('/api/clients', {
      query: {
        mode: 'page',
        q: queryState.value.q || undefined,
        status: queryState.value.status === 'all' ? undefined : queryState.value.status,
        hideLeads: '1',
        sort: queryState.value.sort,
        order: queryState.value.order,
        page: queryState.value.page,
        pageSize: queryState.value.pageSize,
      },
      headers: auth.authHeader(),
    })
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (savingClient.value) return
  savingClient.value = true
  const payload = {
    name: form.name,
    company: form.company || null,
    email: form.email,
    phone: form.phone || null,
    status: form.status,
    notes: form.notes || null,
    billingStreet: form.billingStreet || null,
    billingBuilding: form.billingBuilding || null,
    billingPostalCode: form.billingPostalCode || null,
    billingCity: form.billingCity || null,
    billingCountry: form.billingCountry || 'CH',
    acquisitionSource: form.acquisitionSource || null,
    acquisitionMedium: form.acquisitionMedium || null,
    acquisitionCampaign: form.acquisitionCampaign || null,
  }

  try {
    if (editing.value) {
      await store.update(editing.value.id, payload)
      toast.success('Client mis à jour')
    } else {
      const created = await store.add(payload as any)
      toast.success('Client créé')
      if (inviteAfterCreate.value) await runPortalAction(created, 'invite')
    }
    showForm.value = false
    await loadClients()
  } catch {
    toast.error('Erreur de sauvegarde')
  } finally {
    savingClient.value = false
  }
}

async function handleDelete(id: number) {
  if (!confirm('Supprimer ce client ?')) return
  try {
    await store.remove(id)
    toast.success('Client supprimé')
    await loadClients()
  } catch {
    toast.error('Erreur de suppression')
  }
}

const allSelected = computed(() => pageData.value.items.length > 0 && pageData.value.items.every(client => selectedIds.value.includes(client.id)))
const totalPages = computed(() => Math.max(Math.ceil(pageData.value.total / pageData.value.pageSize), 1))

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = selectedIds.value.filter(id => !pageData.value.items.some(client => client.id === id))
  } else {
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...pageData.value.items.map(client => client.id)]))
  }
}

function toggleOne(id: number) {
  if (selectedIds.value.includes(id)) selectedIds.value = selectedIds.value.filter(value => value !== id)
  else selectedIds.value.push(id)
}

async function bulkSetStatus(status: Client['status']) {
  if (!selectedIds.value.length) return
  try {
    await Promise.all(selectedIds.value.map(id => store.update(id, { status })))
    selectedIds.value = []
    toast.success('Statut mis à jour')
    await loadClients()
  } catch {
    toast.error('Erreur action en lot')
  }
}

async function bulkDelete() {
  if (!selectedIds.value.length) return
  if (!confirm(`Supprimer ${selectedIds.value.length} client(s) ?`)) return
  try {
    await Promise.all(selectedIds.value.map(id => store.remove(id)))
    selectedIds.value = []
    toast.success('Clients supprimés')
    await loadClients()
  } catch {
    toast.error('Erreur suppression en lot')
  }
}

function toggleSort(column: 'created_at' | 'name' | 'email' | 'status') {
  if (queryState.value.sort === column) {
    void updateFilters({ order: queryState.value.order === 'asc' ? 'desc' : 'asc' })
    return
  }
  void updateFilters({ sort: column, order: 'asc' })
}

const kanbanColumns = computed(() => ([
  { key: 'active' as const, label: 'Actifs', items: pageData.value.items.filter(client => client.status === 'active') },
  { key: 'inactive' as const, label: 'Inactifs', items: pageData.value.items.filter(client => client.status === 'inactive') },
]))

const draggingClientId = ref<number | null>(null)

function startDrag(id: number) {
  draggingClientId.value = id
}

async function moveClientToStatus(status: Client['status']) {
  const id = draggingClientId.value
  if (!id) return
  try {
    await store.update(id, { status })
    toast.success(`Client passe en ${status}`)
    await loadClients()
  } catch {
    toast.error('Erreur déplacement')
  } finally {
    draggingClientId.value = null
  }
}

watch(() => route.fullPath, async () => {
  selectedIds.value = []
  await loadClients()
})

watch(() => auth.currentOrganizationId, async () => {
  await Promise.all([loadViews(), loadClients()])
})

onMounted(async () => {
  await Promise.all([loadViews(), loadClients()])
})
</script>

<template>
  <div class="space-y-5">
    <section class="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Clients</span>
          <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Clients</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ pageData.total }} client(s)</p>
        </div>
        <button class="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-gradient-brand px-4 text-xs font-semibold text-white shadow-glow-sm transition hover:opacity-90" @click="openNew">Nouveau</button>
      </div>
    </section>

    <AdminAdminToolbar>
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px] gap-2">
        <input :value="queryState.q" class="input-field" placeholder="Rechercher client, société, email..." @input="updateFilters({ q: ($event.target as HTMLInputElement).value })">
        <select :value="queryState.status" class="input-field" @change="updateFilters({ status: ($event.target as HTMLSelectElement).value })">
          <option value="all">Tous statuts</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </select>
        <select :value="queryState.pageSize" class="input-field" @change="updateFilters({ pageSize: ($event.target as HTMLSelectElement).value })">
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
          <option value="100">100 / page</option>
        </select>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <div class="inline-flex rounded-lg border border-gray-200 dark:border-white/[0.12] overflow-hidden">
          <button class="px-2.5 py-1.5 text-xs" :class="queryState.view === 'table' ? 'bg-violet-600 text-white' : 'bg-transparent'" @click="replaceQuery({ view: 'table' })">Table</button>
          <button class="px-2.5 py-1.5 text-xs" :class="queryState.view === 'kanban' ? 'bg-violet-600 text-white' : 'bg-transparent'" @click="replaceQuery({ view: 'kanban' })">Kanban</button>
        </div>
        <input v-model="viewName" class="input-field !h-9 !py-1.5 !text-xs max-w-[220px]" placeholder="Nom de vue">
        <button class="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/[0.12]" @click="saveCurrentView">Sauver la vue</button>
        <button class="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/[0.12]" @click="router.replace({ query: { view: queryState.view } })">Reset</button>
      </div>

      <div v-if="savedViews.length" class="mt-3 flex flex-wrap gap-2">
        <div
          v-for="view in savedViews"
          :key="view.name"
          class="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/[0.12] px-2 py-1"
        >
          <button class="text-xs" @click="applyView(view)">{{ view.name }}</button>
          <button class="text-xs text-red-500" @click="removeView(view.name)">x</button>
        </div>
      </div>
    </AdminAdminToolbar>

    <div v-if="selectedIds.length" class="rounded-xl border border-violet-200/60 bg-violet-50/70 dark:bg-violet-500/10 dark:border-violet-500/20 p-3">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-xs text-violet-700 dark:text-violet-300">{{ selectedIds.length }} sélectionné(s)</p>
        <button class="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/[0.12]" @click="bulkSetStatus('active')">Passer en actif</button>
        <button class="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/[0.12]" @click="bulkSetStatus('inactive')">Passer en inactif</button>
        <button class="px-2.5 py-1.5 rounded-lg text-xs bg-red-500 text-white" @click="bulkDelete">Supprimer</button>
      </div>
    </div>

    <div v-if="queryState.view === 'table'" class="space-y-3">
      <AdminAdminCard v-if="loading">
        <AdminAdminEmptyState title="Chargement..." />
      </AdminAdminCard>

      <div v-else class="sm:hidden space-y-2">
        <AdminAdminCard v-for="client in pageData.items" :key="`mobile-${client.id}`">
          <label class="mb-2 flex items-center gap-2 text-xs text-gray-500">
            <input :checked="selectedIds.includes(client.id)" type="checkbox" @change="toggleOne(client.id)">
            Selectionner
          </label>
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold text-white" :class="avatarTone(client.name)">
                {{ initials(client.name) }}
              </span>
              <div>
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ client.name }}</p>
                <p class="text-xs text-gray-400">{{ client.company || 'Indépendant' }}</p>
              </div>
            </div>
            <span v-if="client.status === 'active'" class="rounded-md bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-500/10 dark:text-green-300">{{ client.status }}</span>
            <span v-else class="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">{{ client.status }}</span>
          </div>
          <p class="mt-2 text-xs text-gray-500">{{ client.email }}</p>
          <p class="text-xs text-gray-400">{{ client.phone || '-' }}</p>
          <span class="mt-2 inline-flex rounded-md px-2 py-1 text-xs font-semibold" :class="portalAccessTone(client)">{{ portalAccessLabels[portalAccessStatus(client)] }}</span>
          <p class="mt-2 text-xs font-medium text-cyan-700 dark:text-cyan-300">{{ client.acquisitionSource || 'Source non attribuée' }}</p>
          <div class="mt-3 flex items-center gap-3">
            <NuxtLink :to="`/admin/clients/${client.id}`" class="text-xs text-sky-600">Voir</NuxtLink>
            <button class="text-xs text-violet-600" @click="openEdit(client)">Éditer</button>
            <button class="text-xs font-semibold text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-300" @click="openPortalAccess(client)">Gérer l’accès</button>
            <button class="text-xs text-red-500" @click="handleDelete(client.id)">Supprimer</button>
          </div>
        </AdminAdminCard>
        <AdminAdminEmptyState v-if="!pageData.items.length" title="Aucun client" body="Ajuste les filtres ou crée un nouveau client." />
      </div>

      <div v-if="!loading" class="hidden sm:block overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/[0.06] dark:bg-[#111118]">
        <table class="w-full">
          <thead class="border-b border-gray-100 dark:border-white/[0.06]">
            <tr>
              <th class="px-5 py-3 text-left text-xs uppercase text-gray-400">
                <input :checked="allSelected" type="checkbox" @change="toggleAll">
              </th>
              <th class="px-5 py-3 text-left text-xs uppercase text-gray-400">
                <button class="inline-flex items-center gap-1" @click="toggleSort('name')">Nom</button>
              </th>
              <th class="px-5 py-3 text-left text-xs uppercase text-gray-400">
                <button class="inline-flex items-center gap-1" @click="toggleSort('email')">Contact</button>
              </th>
              <th class="px-5 py-3 text-left text-xs uppercase text-gray-400">
                <button class="inline-flex items-center gap-1" @click="toggleSort('status')">Statut</button>
              </th>
              <th class="px-5 py-3 text-left text-xs uppercase text-gray-400">
                <button class="inline-flex items-center gap-1" @click="toggleSort('created_at')">Création</button>
              </th>
              <th class="px-5 py-3 text-right text-xs uppercase text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="client in pageData.items" :key="client.id" class="border-b border-gray-50 dark:border-white/[0.03] last:border-0">
              <td class="px-5 py-3">
                <input :checked="selectedIds.includes(client.id)" type="checkbox" @change="toggleOne(client.id)">
              </td>
              <td class="px-5 py-3">
                <div class="flex items-center gap-2.5">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold text-white" :class="avatarTone(client.name)">
                    {{ initials(client.name) }}
                  </span>
                  <div>
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ client.name }}</p>
                    <p class="text-xs text-gray-400">{{ client.company || 'Indépendant' }}</p>
                    <p class="mt-0.5 text-xs font-medium text-cyan-700 dark:text-cyan-300">{{ client.acquisitionSource || 'Non attribuée' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3">
                <p class="text-xs text-gray-500">{{ client.email }}</p>
                <p class="text-xs text-gray-400">{{ client.phone || '-' }}</p>
                <span class="mt-1.5 inline-flex rounded-md px-2 py-1 text-xs font-semibold" :class="portalAccessTone(client)">{{ portalAccessLabels[portalAccessStatus(client)] }}</span>
              </td>
              <td class="px-5 py-3">
                <span v-if="client.status === 'active'" class="rounded-md bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-500/10 dark:text-green-300">{{ client.status }}</span>
                <span v-else class="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">{{ client.status }}</span>
              </td>
              <td class="px-5 py-3 text-xs text-gray-400">{{ client.createdAt }}</td>
              <td class="px-5 py-3 text-right space-x-2">
                <NuxtLink :to="`/admin/clients/${client.id}`" class="text-xs text-sky-600">Voir</NuxtLink>
                <button class="text-xs text-violet-600" @click="openEdit(client)">Éditer</button>
                <button class="text-xs font-semibold text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-300" @click="openPortalAccess(client)">Accès</button>
                <button class="text-xs text-red-500" @click="handleDelete(client.id)">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <AdminAdminCard
        v-for="column in kanbanColumns"
        :key="column.key"
        class="min-h-[320px]"
        @dragover.prevent
        @drop.prevent="moveClientToStatus(column.key)"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold">{{ column.label }}</h3>
          <span class="text-xs text-gray-400">{{ column.items.length }}</span>
        </div>
        <div class="space-y-2">
          <article
            v-for="client in column.items"
            :key="`kanban-${client.id}`"
            draggable="true"
            class="rounded-lg border border-gray-100 dark:border-white/[0.06] bg-gray-50/70 dark:bg-white/[0.03] p-2.5 cursor-move"
            @dragstart="startDrag(client.id)"
          >
            <p class="text-sm font-medium">{{ client.name }}</p>
            <p class="text-xs text-gray-500">{{ client.company || 'Indépendant' }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ client.email }}</p>
            <div class="mt-2 flex items-center gap-2">
              <NuxtLink :to="`/admin/clients/${client.id}`" class="text-xs text-sky-600">Voir</NuxtLink>
              <button class="text-xs text-violet-600" @click="openEdit(client)">Éditer</button>
              <button class="text-xs font-semibold text-cyan-700 dark:text-cyan-300" @click="openPortalAccess(client)">Accès portail</button>
            </div>
          </article>
          <p v-if="!column.items.length" class="text-xs text-gray-400 py-6 text-center">Aucun client</p>
        </div>
      </AdminAdminCard>
    </div>

    <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-white/[0.06] dark:bg-[#111118]">
      <p class="text-xs text-gray-500">Page {{ pageData.page }} / {{ totalPages }} · {{ pageData.total }} resultat(s)</p>
      <div class="flex items-center gap-2">
        <button class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-white/[0.12]" :disabled="pageData.page <= 1" @click="replaceQuery({ page: String(pageData.page - 1) })">Precedent</button>
        <button class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-white/[0.12]" :disabled="pageData.page >= totalPages" @click="replaceQuery({ page: String(pageData.page + 1) })">Suivant</button>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="showForm" ref="dialogRef" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="client-form-title" tabindex="-1" @keydown="handleDialogKeydown">
        <div class="absolute inset-0 bg-black/40" @click="showForm = false" />
        <form class="admin-modal-panel relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#111118] rounded-xl p-4 sm:p-5 space-y-3" :aria-busy="savingClient" @submit.prevent="handleSubmit">
          <h2 id="client-form-title" class="font-semibold text-gray-900 dark:text-white">{{ editing ? 'Modifier client' : 'Nouveau client' }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input v-model="form.name" class="input-field" placeholder="Nom" required>
            <input v-model="form.company" class="input-field" placeholder="Société">
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input v-model="form.email" type="email" class="input-field" placeholder="Email" required>
            <input v-model="form.phone" class="input-field" placeholder="Telephone">
          </div>
          <select v-model="form.status" class="input-field">
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </select>
          <label v-if="!editing" class="flex items-start gap-3 rounded-lg border border-violet-200/70 bg-violet-50/60 p-3 text-sm dark:border-violet-500/20 dark:bg-violet-500/[0.08]">
            <input v-model="inviteAfterCreate" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500">
            <span><strong class="block text-gray-900 dark:text-white">Inviter ce client après sa création</strong><span class="mt-0.5 block text-xs leading-5 text-gray-600 dark:text-gray-300">Il recevra un lien personnel pour choisir son mot de passe et ouvrir son espace sécurisé.</span></span>
          </label>
          <fieldset class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-white/[0.08]">
            <legend class="px-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Acquisition</legend>
            <p class="text-xs leading-relaxed text-gray-500 dark:text-gray-400">Indique comment ce contact t’a découvert. Ces informations alimentent directement Analytics.</p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Source
                <input v-model="form.acquisitionSource" class="input-field" list="acquisition-source-options" placeholder="Ex. Instagram, recommandation">
              </label>
              <label class="space-y-1 text-xs text-gray-500 dark:text-gray-400">Canal
                <input v-model="form.acquisitionMedium" class="input-field" placeholder="Ex. social, bouche à oreille">
              </label>
            </div>
            <label class="block space-y-1 text-xs text-gray-500 dark:text-gray-400">Campagne
              <input v-model="form.acquisitionCampaign" class="input-field" placeholder="Ex. Portfolio été 2026">
            </label>
            <datalist id="acquisition-source-options">
              <option value="Direct" />
              <option value="Google" />
              <option value="Instagram" />
              <option value="LinkedIn" />
              <option value="Recommandation" />
              <option value="Réseau professionnel" />
            </datalist>
          </fieldset>
          <textarea v-model="form.notes" rows="3" class="input-field" placeholder="Notes" />
          <fieldset class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-white/[0.08]">
            <legend class="px-1 text-xs font-semibold uppercase text-gray-500">Adresse de facturation</legend>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
              <label class="space-y-1 text-xs text-gray-500">Rue<input v-model="form.billingStreet" class="input-field" autocomplete="street-address"></label>
              <label class="space-y-1 text-xs text-gray-500">N°<input v-model="form.billingBuilding" class="input-field"></label>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-[130px_1fr_90px]">
              <label class="space-y-1 text-xs text-gray-500">NPA<input v-model="form.billingPostalCode" class="input-field" autocomplete="postal-code"></label>
              <label class="space-y-1 text-xs text-gray-500">Localité<input v-model="form.billingCity" class="input-field" autocomplete="address-level2"></label>
              <label class="space-y-1 text-xs text-gray-500">Pays<input v-model="form.billingCountry" maxlength="2" class="input-field" autocomplete="country"></label>
            </div>
          </fieldset>
          <div class="sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end gap-2">
            <button type="button" class="px-3 py-2 text-sm" @click="showForm = false">Annuler</button>
            <button type="submit" class="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white disabled:cursor-wait disabled:opacity-60" :disabled="savingClient">{{ savingClient ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </div>
        </form>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showPortalAccess && portalClient" ref="portalDialogRef" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="portal-access-title" tabindex="-1" @keydown="handlePortalDialogKeydown">
        <div class="absolute inset-0 bg-black/45" @click="closePortalAccess" />
        <section class="admin-modal-panel relative w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-[#111118]" :aria-busy="Boolean(portalAction)">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="portal-access-title" class="font-display text-xl font-semibold text-gray-950 dark:text-white">Accès client de {{ portalClient.name }}</h2>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ portalClient.email }}</p>
            </div>
            <button type="button" class="min-h-10 rounded-lg px-3 text-sm text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:bg-white/[0.07]" @click="closePortalAccess">Fermer</button>
          </div>

          <div class="mt-5 flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3 dark:border-white/[0.08]">
            <div><p class="text-sm font-semibold">État du portail</p><p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Les actions sont journalisées dans l’audit.</p></div>
            <span class="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold" :class="portalAccessTone(portalClient)">{{ portalAccessLabels[portalAccessStatus(portalClient)] }}</span>
          </div>

          <div class="mt-5 space-y-3">
            <div v-if="portalAccessStatus(portalClient) === 'not_invited'" class="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
              <div><p class="text-sm font-semibold">Envoyer la première invitation</p><p class="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">Le lien temporaire permet au client de choisir son mot de passe.</p></div>
              <button type="button" :disabled="Boolean(portalAction)" class="min-h-11 shrink-0 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-offset-[#111118]" @click="runPortalAction(portalClient, 'invite')">{{ portalAction === 'invite' ? 'Envoi…' : 'Envoyer l’invitation' }}</button>
            </div>

            <template v-else-if="portalAccessStatus(portalClient) !== 'disabled'">
              <div class="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
                <div><p class="text-sm font-semibold">{{ portalAccessStatus(portalClient) === 'invited' ? 'Renvoyer le lien d’accès' : 'Réinitialiser le mot de passe' }}</p><p class="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">Un nouveau lien personnel sera envoyé à l’adresse du client.</p></div>
                <button type="button" :disabled="Boolean(portalAction)" class="min-h-11 shrink-0 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait disabled:opacity-60 dark:border-violet-400/25 dark:text-violet-200 dark:hover:bg-violet-400/10" @click="runPortalAction(portalClient, portalAccessStatus(portalClient) === 'invited' ? 'resend' : 'reset')">{{ portalAction ? 'Envoi…' : portalAccessStatus(portalClient) === 'invited' ? 'Renvoyer' : 'Réinitialiser' }}</button>
              </div>
              <div class="flex flex-col gap-3 rounded-lg border border-red-200/80 p-4 dark:border-red-400/20 sm:flex-row sm:items-center sm:justify-between">
                <div><p class="text-sm font-semibold text-red-900 dark:text-red-100">Suspendre l’accès</p><p class="mt-1 text-xs leading-5 text-red-700 dark:text-red-300">Le compte est conservé, mais ce client ne pourra plus consulter cette organisation.</p></div>
                <button type="button" :disabled="Boolean(portalAction)" class="min-h-11 shrink-0 rounded-lg px-4 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-wait disabled:opacity-60 dark:text-red-200 dark:hover:bg-red-400/10" @click="runPortalAction(portalClient, 'disable')">{{ portalAction === 'disable' ? 'Suspension…' : 'Suspendre' }}</button>
              </div>
            </template>

            <div v-else class="flex flex-col gap-3 rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07] sm:flex-row sm:items-center sm:justify-between">
              <div><p class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Réactiver cet accès</p><p class="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-300">Le client retrouvera immédiatement ses projets et documents existants.</p></div>
              <button type="button" :disabled="Boolean(portalAction)" class="min-h-11 shrink-0 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-offset-[#111118]" @click="runPortalAction(portalClient, 'enable')">{{ portalAction === 'enable' ? 'Réactivation…' : 'Réactiver' }}</button>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>
