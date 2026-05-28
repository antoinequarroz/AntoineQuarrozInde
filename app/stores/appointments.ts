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

export const useAppointmentsStore = defineStore('appointments', () => {
  const auth = useAuthStore()
  const appointments = ref<Appointment[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  async function ensureLoaded(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const rows = await $fetch<AppointmentRow[]>('/api/appointments', { headers: auth.authHeader() })
      appointments.value = rows.map(mapAppointment)
      loaded.value = true
    } finally {
      loading.value = false
    }
  }
  async function add(payload: Omit<Appointment, 'id' | 'createdAt'>) {
    const row = await $fetch<AppointmentRow>('/api/appointments', { method: 'POST', body: payload, headers: auth.authHeader() })
    appointments.value.unshift(mapAppointment(row))
  }
  async function update(id: number, payload: Partial<Appointment>) {
    const row = await $fetch<AppointmentRow>('/api/appointments', { method: 'PUT', body: { ...payload, id }, headers: auth.authHeader() })
    const idx = appointments.value.findIndex(q => q.id === id)
    if (idx !== -1) appointments.value[idx] = mapAppointment(row)
  }
  async function remove(id: number) {
    await $fetch('/api/appointments', { method: 'DELETE', query: { id }, headers: auth.authHeader() })
    appointments.value = appointments.value.filter(q => q.id !== id)
  }
  return { appointments, loaded, loading, ensureLoaded, add, update, remove }
})
