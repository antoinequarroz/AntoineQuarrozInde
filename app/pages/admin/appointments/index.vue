<script setup lang="ts">
import type { Appointment } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useAppointmentsStore()
const clients = useClientsStore()
const route = useRoute()
const toast = useToast()
const isOffline = ref(false)
let onlineStateHandler: (() => void) | null = null
const showForm = ref(false)
const editing = ref<Appointment | null>(null)
const selectedDate = ref<string | null>(null)
const currentMonth = ref(new Date())
const form = reactive({
  title: '',
  clientId: null as number | null,
  description: '',
  startsAt: '',
  endsAt: '',
  location: '',
  meetingUrl: '',
  status: 'scheduled' as Appointment['status'],
})
const clientsById = computed(() => new Map(clients.clients.map(c => [c.id, c])))
const weekdayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const monthLabel = computed(() => currentMonth.value.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' }))
const monthMatrix = computed(() => {
  const first = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
  const last = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0)
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = last.getDate()
  const cells: Array<{ key: string, date: string | null, day: number | null }> = []
  for (let i = 0; i < startOffset; i++) cells.push({ key: `pad-start-${i}`, date: null, day: null })
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), day)
    const iso = d.toISOString().slice(0, 10)
    cells.push({ key: iso, date: iso, day })
  }
  while (cells.length % 7 !== 0) cells.push({ key: `pad-end-${cells.length}`, date: null, day: null })
  return cells
})
const eventsByDate = computed(() => {
  const map = new Map<string, Appointment[]>()
  for (const item of store.appointments) {
    const iso = new Date(item.startsAt).toISOString().slice(0, 10)
    const list = map.get(iso) || []
    list.push(item)
    map.set(iso, list)
  }
  return map
})
const visibleAppointments = computed(() => {
  if (!selectedDate.value) return store.appointments
  return store.appointments.filter((item) => new Date(item.startsAt).toISOString().slice(0, 10) === selectedDate.value)
})

function formatDateTime(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' })
}

function previousMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
}

function nextMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
}

function toIcsDate(value: string) {
  const d = new Date(value)
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function downloadIcs(item: Appointment) {
  const uid = `appt-${item.id}@antoinequarroz.ch`
  const now = toIcsDate(new Date().toISOString())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Antoine Quarroz//Agenda//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsDate(item.startsAt)}`,
    `DTEND:${toIcsDate(item.endsAt)}`,
    `SUMMARY:${escapeIcs(item.title)}`,
    item.description ? `DESCRIPTION:${escapeIcs(item.description)}` : '',
    item.location ? `LOCATION:${escapeIcs(item.location)}` : '',
    item.meetingUrl ? `URL:${escapeIcs(item.meetingUrl)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rdv-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || item.id}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

function openNew() {
  editing.value = null
  Object.assign(form, {
    title: '',
    clientId: null,
    description: '',
    startsAt: '',
    endsAt: '',
    location: '',
    meetingUrl: '',
    status: 'scheduled',
  })
  showForm.value = true
}

function openEdit(item: Appointment) {
  editing.value = item
  Object.assign(form, item)
  showForm.value = true
}

async function submit() {
  try {
    const payload = {
      ...form,
      description: form.description || null,
      location: form.location || null,
      meetingUrl: form.meetingUrl || null,
    }
    if (editing.value) await store.update(editing.value.id, payload as any)
    else await store.add(payload as any)
    showForm.value = false
    toast.success('Enregistre')
  } catch {
    toast.error('Erreur')
  }
}

async function del(id: number) {
  if (!confirm('Supprimer ce rendez-vous ?')) return
  try {
    await store.remove(id)
    toast.success('Supprime')
  } catch {
    toast.error('Erreur')
  }
}

onMounted(async () => {
  await Promise.all([store.ensureLoaded(), clients.ensureLoaded()])
  isOffline.value = !navigator.onLine
  onlineStateHandler = () => {
    isOffline.value = !navigator.onLine
    if (!isOffline.value) void store.flushQueue()
  }
  window.addEventListener('online', onlineStateHandler)
  window.addEventListener('offline', onlineStateHandler)
  if (route.query.new === '1') {
    openNew()
    const id = Number(route.query.clientId || 0)
    if (id) form.clientId = id
  }
})

onBeforeUnmount(() => {
  if (!onlineStateHandler) return
  window.removeEventListener('online', onlineStateHandler)
  window.removeEventListener('offline', onlineStateHandler)
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display font-semibold text-xl">Agenda</h1>
        <p v-if="isOffline || store.pendingCount > 0 || store.syncing" class="text-xs text-amber-500 mt-1">
          <span v-if="store.syncing">Synchronisation en cours...</span>
          <span v-else-if="isOffline">Hors ligne: modifications en attente ({{ store.pendingCount }})</span>
          <span v-else>Modifications en attente: {{ store.pendingCount }}</span>
        </p>
      </div>
      <button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm" @click="openNew">Nouveau RDV</button>
    </div>

    <div class="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111118] p-3 sm:p-4">
      <div class="flex items-center justify-between gap-2">
        <button class="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.12] text-xs" @click="previousMonth">←</button>
        <p class="text-sm font-semibold capitalize">{{ monthLabel }}</p>
        <button class="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.12] text-xs" @click="nextMonth">→</button>
      </div>
      <div class="mt-3 grid grid-cols-7 gap-1 text-center">
        <p v-for="day in weekdayLabels" :key="day" class="text-[11px] text-gray-400">{{ day }}</p>
        <button
          v-for="cell in monthMatrix"
          :key="cell.key"
          class="h-10 rounded-lg text-xs relative"
          :class="[
            !cell.date ? 'opacity-0 pointer-events-none' : 'hover:bg-gray-100 dark:hover:bg-white/[0.06]',
            selectedDate === cell.date ? 'bg-violet-600 text-white hover:bg-violet-600' : 'text-gray-700 dark:text-gray-200',
          ]"
          @click="selectedDate = cell.date"
        >
          {{ cell.day }}
          <span v-if="cell.date && eventsByDate.get(cell.date)?.length" class="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-violet-500" :class="selectedDate === cell.date ? 'bg-white' : 'bg-violet-500'" />
        </button>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <p class="text-xs text-gray-500">
          <span v-if="selectedDate">Filtre: {{ selectedDate }}</span>
          <span v-else>Tous les rendez-vous</span>
        </p>
        <button v-if="selectedDate" class="text-xs text-violet-600" @click="selectedDate = null">Réinitialiser</button>
      </div>
    </div>

    <div class="sm:hidden space-y-2">
      <div
        v-for="item in visibleAppointments"
        :key="`m-${item.id}`"
        class="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111118] p-3"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold">{{ item.title }}</p>
          <span class="text-[11px] uppercase text-gray-400">{{ item.status }}</span>
        </div>
        <p class="mt-1 text-xs text-gray-500">{{ item.clientId ? clientsById.get(item.clientId)?.name || '-' : '-' }}</p>
        <p class="mt-1 text-xs text-gray-500">Début: {{ formatDateTime(item.startsAt) }}</p>
        <p class="mt-1 text-xs text-gray-500">Fin: {{ formatDateTime(item.endsAt) }}</p>
        <div class="mt-3 flex items-center gap-3">
          <button class="text-xs text-sky-600" @click="downloadIcs(item)">ICS</button>
          <button class="text-xs text-violet-600" @click="openEdit(item)">Editer</button>
          <button class="text-xs text-red-500" @click="del(item.id)">Supprimer</button>
        </div>
      </div>
    </div>

    <div class="admin-table-wrap hidden sm:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden overflow-x-auto">
      <table class="admin-table w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Titre</th>
            <th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Client</th>
            <th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Debut</th>
            <th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Fin</th>
            <th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Statut</th>
            <th class="text-right px-4 py-3 text-xs uppercase text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in visibleAppointments" :key="item.id" class="border-b border-gray-50 dark:border-white/[0.03]">
            <td class="px-4 py-3 text-sm">{{ item.title }}</td>
            <td class="px-4 py-3 text-sm">{{ item.clientId ? clientsById.get(item.clientId)?.name || '-' : '-' }}</td>
            <td class="px-4 py-3 text-sm">{{ formatDateTime(item.startsAt) }}</td>
            <td class="px-4 py-3 text-sm">{{ formatDateTime(item.endsAt) }}</td>
            <td class="px-4 py-3 text-sm">{{ item.status }}</td>
            <td class="px-4 py-3 text-right space-x-2">
              <button class="text-xs text-sky-600" @click="downloadIcs(item)">ICS</button>
              <button class="text-xs text-violet-600" @click="openEdit(item)">Editer</button>
              <button class="text-xs text-red-500" @click="del(item.id)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div class="absolute inset-0 bg-black/40" @click="showForm = false" />
        <form class="admin-modal-panel relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#111118] rounded-xl p-4 sm:p-5 space-y-3" @submit.prevent="submit">
          <input v-model="form.title" class="input-field" placeholder="Titre" required>
          <select v-model.number="form.clientId" class="input-field">
            <option :value="null">Aucun client</option>
            <option v-for="c in clients.clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <textarea v-model="form.description" rows="3" class="input-field" placeholder="Description" />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input v-model="form.startsAt" type="datetime-local" class="input-field" required>
            <input v-model="form.endsAt" type="datetime-local" class="input-field" required>
          </div>
          <input v-model="form.location" class="input-field" placeholder="Lieu (optionnel)">
          <input v-model="form.meetingUrl" class="input-field" placeholder="Lien visio (optionnel)">
          <select v-model="form.status" class="input-field">
            <option value="scheduled">scheduled</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end gap-2">
            <button type="button" class="px-3 py-2 text-sm" @click="showForm = false">Annuler</button>
            <button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Enregistrer</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
