import type { Client } from '~/types'

type ClientRow = {
  id: number
  name: string
  company: string | null
  email: string
  phone: string | null
  status: 'lead' | 'active' | 'inactive'
  notes: string | null
  created_at: string
}

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at?.slice(0, 10) ?? '',
  }
}

export const useClientsStore = defineStore('clients', () => {
  const auth = useAuthStore()
  const clients = ref<Client[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function ensureLoaded(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const rows = await $fetch<ClientRow[]>('/api/clients', {
        headers: auth.authHeader(),
      })
      clients.value = rows.map(mapClient)
      loaded.value = true
    }
    finally {
      loading.value = false
    }
  }

  async function add(client: Omit<Client, 'id' | 'createdAt'>) {
    const row = await $fetch<ClientRow>('/api/clients', {
      method: 'POST',
      body: client,
      headers: auth.authHeader(),
    })
    const mapped = mapClient(row)
    clients.value.unshift(mapped)
    return mapped
  }

  async function update(id: number, data: Partial<Client>) {
    const row = await $fetch<ClientRow>('/api/clients', {
      method: 'PUT',
      body: { ...data, id },
      headers: auth.authHeader(),
    })
    const idx = clients.value.findIndex(c => c.id === id)
    if (idx !== -1) clients.value[idx] = mapClient(row)
  }

  async function remove(id: number) {
    await $fetch('/api/clients', {
      method: 'DELETE',
      query: { id },
      headers: auth.authHeader(),
    })
    clients.value = clients.value.filter(c => c.id !== id)
  }

  const active = computed(() => clients.value.filter(c => c.status === 'active'))
  return { clients, active, loading, loaded, ensureLoaded, add, update, remove }
})
