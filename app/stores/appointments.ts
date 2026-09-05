import type { Appointment } from '~/types'

type AppointmentRow = {
  id: number
  title: string
  description: string | null
  client_id: number | null
  starts_at: string
  ends_at: string
  location: string | null
  meeting_url: string | null
  status: 'scheduled' | 'completed' | 'cancelled'
  created_at: string
}

function mapAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    clientId: row.client_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    meetingUrl: row.meeting_url,
    status: row.status,
    createdAt: row.created_at?.slice(0, 10) ?? '',
  }
}

type AppointmentUpsert = Omit<Appointment, 'id' | 'createdAt'>
type PendingOperation =
  | { type: 'add'; tempId: number; payload: AppointmentUpsert }
  | { type: 'update'; id: number; payload: Partial<Appointment> }
  | { type: 'delete'; id: number }

const APPOINTMENTS_CACHE_KEY = 'aq_appointments_cache_v1'
const APPOINTMENTS_QUEUE_KEY = 'aq_appointments_queue_v1'
const APPOINTMENTS_TEMP_ID_KEY = 'aq_appointments_temp_id_v1'

function isOnline() {
  if (!import.meta.client) return true
  return navigator.onLine
}

export const useAppointmentsStore = defineStore('appointments', () => {
  const auth = useAuthStore()
  const appointments = ref<Appointment[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  const syncing = ref(false)
  const pendingQueue = ref<PendingOperation[]>([])
  const listenerAttached = ref(false)
  const loadedContext = ref<string | null>(null)
  const loadingContext = ref<string | null>(null)
  let requestVersion = 0
  let activeLoad: Promise<void> | null = null

  function requestContext() {
    return `authenticated:${auth.userEmail ?? ''}:${auth.currentOrganizationId ?? ''}`
  }

  function storageKey(base: string) {
    return `${base}:${auth.userEmail ?? 'anonymous'}:${auth.currentOrganizationId ?? 'default'}`
  }

  function persistCache() {
    if (!import.meta.client) return
    localStorage.setItem(storageKey(APPOINTMENTS_CACHE_KEY), JSON.stringify(appointments.value))
  }

  function persistQueue() {
    if (!import.meta.client) return
    localStorage.setItem(storageKey(APPOINTMENTS_QUEUE_KEY), JSON.stringify(pendingQueue.value))
  }

  function loadLocalState() {
    if (!import.meta.client) return
    appointments.value = []
    pendingQueue.value = []
    try {
      const rawAppointments = localStorage.getItem(storageKey(APPOINTMENTS_CACHE_KEY))
      if (rawAppointments) appointments.value = JSON.parse(rawAppointments)
    } catch {}
    try {
      const rawQueue = localStorage.getItem(storageKey(APPOINTMENTS_QUEUE_KEY))
      if (rawQueue) pendingQueue.value = JSON.parse(rawQueue)
    } catch {}
  }

  function nextTempId() {
    if (!import.meta.client) return -Date.now()
    const key = storageKey(APPOINTMENTS_TEMP_ID_KEY)
    const raw = localStorage.getItem(key)
    const current = raw ? Number(raw) : -1
    const next = Number.isFinite(current) && current < 0 ? current - 1 : -1
    localStorage.setItem(key, String(next))
    return next
  }

  function queueOp(op: PendingOperation) {
    pendingQueue.value.push(op)
    persistQueue()
  }

  function attachOnlineListener() {
    if (!import.meta.client || listenerAttached.value) return
    window.addEventListener('online', () => {
      void flushQueue()
    })
    listenerAttached.value = true
  }

  function ensureLoaded(force = false) {
    const context = requestContext()
    if (loading.value && loadingContext.value === context && activeLoad) return activeLoad
    if (loaded.value && loadedContext.value === context && !force) return Promise.resolve()
    const version = ++requestVersion
    loadLocalState()
    attachOnlineListener()
    loading.value = true
    loadingContext.value = context
    const load = (async () => {
      if (!isOnline()) {
        loaded.value = appointments.value.length > 0
        loadedContext.value = context
        if (!loaded.value) throw new Error('Agenda indisponible hors ligne : aucun cache local.')
        return
      }
      const rows = await $fetch<AppointmentRow[]>('/api/appointments', { headers: auth.authHeader() })
      if (version !== requestVersion) return
      appointments.value = rows.map(mapAppointment)
      loaded.value = true
      loadedContext.value = context
      persistCache()
      if (pendingQueue.value.length > 0) await flushQueue()
    })().finally(() => {
      if (version === requestVersion) {
        loading.value = false
        loadingContext.value = null
      }
      if (activeLoad === load) activeLoad = null
    })
    activeLoad = load
    return load
  }

  async function add(payload: AppointmentUpsert) {
    if (!isOnline()) {
      const tempId = nextTempId()
      const optimistic: Appointment = {
        id: tempId,
        title: payload.title,
        description: payload.description ?? null,
        clientId: payload.clientId ?? null,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        location: payload.location ?? null,
        meetingUrl: payload.meetingUrl ?? null,
        status: payload.status,
        createdAt: new Date().toISOString().slice(0, 10),
      }
      appointments.value.unshift(optimistic)
      queueOp({ type: 'add', tempId, payload })
      persistCache()
      return optimistic
    }
    const row = await $fetch<AppointmentRow>('/api/appointments', { method: 'POST', body: payload, headers: auth.authHeader() })
    appointments.value.unshift(mapAppointment(row))
    persistCache()
  }

  async function update(id: number, payload: Partial<Appointment>) {
    const idx = appointments.value.findIndex(q => q.id === id)
    if (idx !== -1) {
      const current = appointments.value[idx]
      if (current) appointments.value[idx] = { ...current, ...payload }
      persistCache()
    }
    if (!isOnline()) {
      const addOpIdx = pendingQueue.value.findIndex(op => op.type === 'add' && op.tempId === id)
      if (addOpIdx !== -1) {
        const existing = pendingQueue.value[addOpIdx] as Extract<PendingOperation, { type: 'add' }>
        pendingQueue.value[addOpIdx] = { ...existing, payload: { ...existing.payload, ...payload } }
        persistQueue()
        return
      }
      queueOp({ type: 'update', id, payload })
      return
    }
    const row = await $fetch<AppointmentRow>('/api/appointments', { method: 'PUT', body: { ...payload, id }, headers: auth.authHeader() })
    if (idx !== -1) appointments.value[idx] = mapAppointment(row)
    persistCache()
  }

  async function remove(id: number) {
    appointments.value = appointments.value.filter(q => q.id !== id)
    persistCache()
    if (!isOnline()) {
      const before = pendingQueue.value.length
      pendingQueue.value = pendingQueue.value.filter(op => !(op.type === 'add' && op.tempId === id))
      if (pendingQueue.value.length === before) queueOp({ type: 'delete', id })
      else persistQueue()
      return
    }
    await $fetch('/api/appointments', { method: 'DELETE', query: { id }, headers: auth.authHeader() })
    persistCache()
  }

  async function flushQueue() {
    if (!isOnline() || syncing.value || pendingQueue.value.length === 0) return
    syncing.value = true
    try {
      const mapping = new Map<number, number>()
      while (pendingQueue.value.length > 0) {
        const op = pendingQueue.value.shift()
        if (!op) break
        if (op.type === 'add') {
          const row = await $fetch<AppointmentRow>('/api/appointments', {
            method: 'POST',
            body: op.payload,
            headers: auth.authHeader(),
          })
          const mapped = mapAppointment(row)
          const localIdx = appointments.value.findIndex(a => a.id === op.tempId)
          if (localIdx !== -1) appointments.value[localIdx] = mapped
          mapping.set(op.tempId, mapped.id)
        }
        if (op.type === 'update') {
          const finalId = mapping.get(op.id) ?? op.id
          if (finalId > 0) {
            const row = await $fetch<AppointmentRow>('/api/appointments', {
              method: 'PUT',
              body: { ...op.payload, id: finalId },
              headers: auth.authHeader(),
            })
            const idx = appointments.value.findIndex(a => a.id === finalId)
            if (idx !== -1) appointments.value[idx] = mapAppointment(row)
          }
        }
        if (op.type === 'delete') {
          const finalId = mapping.get(op.id) ?? op.id
          if (finalId > 0) {
            await $fetch('/api/appointments', {
              method: 'DELETE',
              query: { id: finalId },
              headers: auth.authHeader(),
            })
            appointments.value = appointments.value.filter(a => a.id !== finalId)
          }
        }
        persistQueue()
        persistCache()
      }
    } finally {
      syncing.value = false
    }
  }

  const pendingCount = computed(() => pendingQueue.value.length)

  return { appointments, loaded, loading, syncing, pendingCount, ensureLoaded, add, update, remove, flushQueue }
})
