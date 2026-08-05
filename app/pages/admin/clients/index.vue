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

function resetForm() {
  Object.assign(form, { name: '', company: '', email: '', phone: '', status: 'active', notes: '', billingStreet: '', billingBuilding: '', billingPostalCode: '', billingCity: '', billingCountry: 'CH' })
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
  })
  showForm.value = true
}

async function inviteToPortal(client: Client) {
  try {
    const result = await $fetch<{ email: string }>('/api/admin/clients/invite', { method: 'POST', body: { clientId: client.id }, headers: auth.authHeader() })
    toast.success(`Accès portail activé pour ${result.email}`)
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Impossible d’activer le portail client')
  }
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
  const payload = {
    name: form.name,
    company: form.company || null,
    email: form.email,
    phone: form.phone || null,
    status: form.status,
    notes: form.notes || null,
  }

  try {
    if (editing.value) {
      await store.update(editing.value.id, payload)
      toast.success('Client mis à jour')
    } else {
      await store.add(payload as any)
      toast.success('Client créé')
    }
    showForm.value = false
    await loadClients()
  } catch {
    toast.error('Erreur de sauvegarde')
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
}, { immediate: true })

watch(() => auth.currentOrganizationId, async () => {
  await Promise.all([loadViews(), loadClients()])
})

onMounted(async () => {
  await loadViews()
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
            <span class="text-xs px-2 py-1 rounded-md" :class="client.status === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400'">
              {{ client.status }}
            </span>
          </div>
          <p class="mt-2 text-xs text-gray-500">{{ client.email }}</p>
          <p class="text-xs text-gray-400">{{ client.phone || '-' }}</p>
          <div class="mt-3 flex items-center gap-3">
            <NuxtLink :to="`/admin/clients/${client.id}`" class="text-xs text-sky-600">Voir</NuxtLink>
            <button class="text-xs text-violet-600" @click="openEdit(client)">Éditer</button>
            <button class="text-xs text-cyan-700 dark:text-cyan-300" @click="inviteToPortal(client)">Portail</button>
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
                  </div>
                </div>
              </td>
              <td class="px-5 py-3">
                <p class="text-xs text-gray-500">{{ client.email }}</p>
                <p class="text-xs text-gray-400">{{ client.phone || '-' }}</p>
              </td>
              <td class="px-5 py-3">
                <span class="text-xs px-2 py-1 rounded-md" :class="client.status === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400'">
                  {{ client.status }}
                </span>
              </td>
              <td class="px-5 py-3 text-xs text-gray-400">{{ client.createdAt }}</td>
              <td class="px-5 py-3 text-right space-x-2">
                <NuxtLink :to="`/admin/clients/${client.id}`" class="text-xs text-sky-600">Voir</NuxtLink>
                <button class="text-xs text-violet-600" @click="openEdit(client)">Éditer</button>
                <button class="text-xs text-cyan-700 dark:text-cyan-300" @click="inviteToPortal(client)">Portail</button>
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
        <form class="admin-modal-panel relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#111118] rounded-xl p-4 sm:p-5 space-y-3" @submit.prevent="handleSubmit">
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
            <button type="submit" class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Enregistrer</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
