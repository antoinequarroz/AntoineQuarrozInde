<script setup lang="ts">
import type { Client } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useClientsStore()
const toast = useToast()

const showForm = ref(false)
const editing = ref<Client | null>(null)
const selectedIds = ref<number[]>([])
const search = ref('')
const statusFilter = ref<'all' | Client['status']>('all')
const viewName = ref('')
const savedViews = ref<Array<{ name: string, search: string, status: 'all' | Client['status'] }>>([])
const form = reactive({
  name: '',
  company: '',
  email: '',
  phone: '',
  status: 'lead' as Client['status'],
  notes: '',
})

function resetForm() {
  Object.assign(form, { name: '', company: '', email: '', phone: '', status: 'lead', notes: '' })
}

const FILTER_VIEWS_KEY = 'aq_admin_clients_views_v1'

function loadViews() {
  try {
    const raw = localStorage.getItem(FILTER_VIEWS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) savedViews.value = parsed
  } catch {}
}

function persistViews() {
  localStorage.setItem(FILTER_VIEWS_KEY, JSON.stringify(savedViews.value))
}

function saveCurrentView() {
  const name = viewName.value.trim()
  if (!name) return
  const existing = savedViews.value.findIndex(v => v.name.toLowerCase() === name.toLowerCase())
  const payload = { name, search: search.value, status: statusFilter.value }
  if (existing >= 0) savedViews.value[existing] = payload
  else savedViews.value.push(payload)
  persistViews()
  viewName.value = ''
  toast.success('Vue sauvegardee')
}

function applyView(view: { name: string, search: string, status: 'all' | Client['status'] }) {
  search.value = view.search
  statusFilter.value = view.status
}

function removeView(name: string) {
  savedViews.value = savedViews.value.filter(v => v.name !== name)
  persistViews()
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
  })
  showForm.value = true
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
      toast.success('Client mis a jour')
    } else {
      await store.add(payload as any)
      toast.success('Client cree')
    }
    showForm.value = false
  } catch {
    toast.error('Erreur de sauvegarde')
  }
}

async function handleDelete(id: number) {
  if (!confirm('Supprimer ce client ?')) return
  try {
    await store.remove(id)
    toast.success('Client supprime')
  } catch {
    toast.error('Erreur de suppression')
  }
}

const allSelected = computed(() => filteredClients.value.length > 0 && filteredClients.value.every(c => selectedIds.value.includes(c.id)))

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = selectedIds.value.filter(id => !filteredClients.value.some(c => c.id === id))
  } else {
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...filteredClients.value.map(c => c.id)]))
  }
}

function toggleOne(id: number) {
  if (selectedIds.value.includes(id)) selectedIds.value = selectedIds.value.filter(x => x !== id)
  else selectedIds.value.push(id)
}

async function bulkSetStatus(status: Client['status']) {
  if (!selectedIds.value.length) return
  try {
    await Promise.all(selectedIds.value.map(id => store.update(id, { status })))
    toast.success(`Statut mis a jour (${selectedIds.value.length})`)
    selectedIds.value = []
  } catch {
    toast.error('Erreur action en lot')
  }
}

async function bulkDelete() {
  if (!selectedIds.value.length) return
  if (!confirm(`Supprimer ${selectedIds.value.length} client(s) ?`)) return
  try {
    await Promise.all(selectedIds.value.map(id => store.remove(id)))
    toast.success(`Clients supprimes (${selectedIds.value.length})`)
    selectedIds.value = []
  } catch {
    toast.error('Erreur suppression en lot')
  }
}

const filteredClients = computed(() => {
  const q = search.value.trim().toLowerCase()
  return store.clients.filter((client) => {
    const byStatus = statusFilter.value === 'all' || client.status === statusFilter.value
    if (!byStatus) return false
    if (!q) return true
    return [client.name, client.company || '', client.email, client.phone || ''].join(' ').toLowerCase().includes(q)
  })
})

onMounted(() => {
  store.ensureLoaded()
  loadViews()
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="font-display font-semibold text-xl text-gray-900 dark:text-white">Clients</h1>
        <p class="text-sm text-gray-400 mt-0.5">{{ store.clients.length }} client(s)</p>
      </div>
      <button class="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white" @click="openNew">Nouveau</button>
    </div>

    <div class="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111118] p-3 space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-2">
        <input v-model="search" class="input-field" placeholder="Rechercher client, societe, email...">
        <select v-model="statusFilter" class="input-field">
          <option value="all">Tous statuts</option>
          <option value="lead">Lead</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <input v-model="viewName" class="input-field !h-9 !py-1.5 !text-xs max-w-[220px]" placeholder="Nom de vue">
        <button class="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/[0.12]" @click="saveCurrentView">Sauver la vue</button>
        <button class="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/[0.12]" @click="search=''; statusFilter='all'">Reset</button>
      </div>
      <div v-if="savedViews.length" class="flex flex-wrap gap-2">
        <div
          v-for="view in savedViews"
          :key="view.name"
          class="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/[0.12] px-2 py-1"
        >
          <button class="text-xs" @click="applyView(view)">{{ view.name }}</button>
          <button class="text-[11px] text-red-500" @click="removeView(view.name)">x</button>
        </div>
      </div>
    </div>

    <div v-if="selectedIds.length" class="rounded-xl border border-violet-200/60 bg-violet-50/70 dark:bg-violet-500/10 dark:border-violet-500/20 p-3">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-xs text-violet-700 dark:text-violet-300">{{ selectedIds.length }} selectionne(s)</p>
        <button class="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/[0.12]" @click="bulkSetStatus('lead')">Passer en lead</button>
        <button class="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/[0.12]" @click="bulkSetStatus('active')">Passer en active</button>
        <button class="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-white/[0.12]" @click="bulkSetStatus('inactive')">Passer en inactive</button>
        <button class="px-2.5 py-1.5 rounded-lg text-xs bg-red-500 text-white" @click="bulkDelete">Supprimer</button>
      </div>
    </div>

    <div class="space-y-3">
      <div class="sm:hidden space-y-2">
        <div
          v-for="client in filteredClients"
          :key="`mobile-${client.id}`"
          class="rounded-xl border p-3 bg-white dark:bg-[#111118] border-gray-100 dark:border-white/[0.06]"
        >
          <label class="mb-2 flex items-center gap-2 text-xs text-gray-500">
            <input :checked="selectedIds.includes(client.id)" type="checkbox" @change="toggleOne(client.id)">
            Selectionner
          </label>
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ client.name }}</p>
              <p class="text-xs text-gray-400">{{ client.company || 'Independant' }}</p>
            </div>
            <span class="text-[11px] px-2 py-1 rounded-md"
              :class="client.status === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' : client.status === 'lead' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300' : 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400'">
              {{ client.status }}
            </span>
          </div>
          <p class="mt-2 text-xs text-gray-500">{{ client.email }}</p>
          <p class="text-xs text-gray-400">{{ client.phone || '-' }}</p>
          <div class="mt-3 flex items-center gap-3">
            <NuxtLink :to="`/admin/clients/${client.id}`" class="text-xs text-sky-600">Voir</NuxtLink>
            <button class="text-xs text-violet-600" @click="openEdit(client)">Editer</button>
            <button class="text-xs text-red-500" @click="handleDelete(client.id)">Supprimer</button>
          </div>
        </div>
      </div>

      <div class="admin-table-wrap hidden sm:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="admin-table w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase">
              <input :checked="allSelected" type="checkbox" @change="toggleAll">
            </th>
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase">Nom</th>
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase hidden sm:table-cell">Contact</th>
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase">Statut</th>
            <th class="text-right px-5 py-3 text-xs text-gray-400 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in filteredClients" :key="client.id" class="border-b border-gray-50 dark:border-white/[0.03] last:border-0">
            <td class="px-5 py-3">
              <input :checked="selectedIds.includes(client.id)" type="checkbox" @change="toggleOne(client.id)">
            </td>
            <td class="px-5 py-3">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ client.name }}</p>
              <p class="text-xs text-gray-400">{{ client.company || 'Independant' }}</p>
            </td>
            <td class="px-5 py-3 hidden sm:table-cell">
              <p class="text-xs text-gray-500">{{ client.email }}</p>
              <p class="text-xs text-gray-400">{{ client.phone || '-' }}</p>
            </td>
            <td class="px-5 py-3">
              <span class="text-xs px-2 py-1 rounded-md"
                :class="client.status === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' : client.status === 'lead' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300' : 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400'">
                {{ client.status }}
              </span>
            </td>
            <td class="px-5 py-3 text-right space-x-2">
              <NuxtLink :to="`/admin/clients/${client.id}`" class="text-xs text-sky-600">Voir</NuxtLink>
              <button class="text-xs text-violet-600" @click="openEdit(client)">Editer</button>
              <button class="text-xs text-red-500" @click="handleDelete(client.id)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div class="absolute inset-0 bg-black/40" @click="showForm = false" />
        <form class="admin-modal-panel relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#111118] rounded-xl p-4 sm:p-5 space-y-3" @submit.prevent="handleSubmit">
          <h2 class="font-semibold text-gray-900 dark:text-white">{{ editing ? 'Modifier client' : 'Nouveau client' }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input v-model="form.name" class="input-field" placeholder="Nom" required>
            <input v-model="form.company" class="input-field" placeholder="Societe">
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input v-model="form.email" type="email" class="input-field" placeholder="Email" required>
            <input v-model="form.phone" class="input-field" placeholder="Telephone">
          </div>
          <select v-model="form.status" class="input-field">
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <textarea v-model="form.notes" rows="3" class="input-field" placeholder="Notes" />
          <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end gap-2">
            <button type="button" class="px-3 py-2 text-sm" @click="showForm = false">Annuler</button>
            <button type="submit" class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Enregistrer</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
