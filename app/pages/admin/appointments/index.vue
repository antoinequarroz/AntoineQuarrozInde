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
const closeForm = () => { showForm.value = false }
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(showForm, closeForm)
const editing = ref<Appointment | null>(null)
const selectedDate = ref<string | null>(null)
const currentMonth = ref(new Date())
const loadError = ref('')
const submitting = ref(false)
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

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function zurichDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

const monthLabel = computed(() => currentMonth.value.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' }))
const monthMatrix = computed(() => {
  const first = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
  const last = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0)
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = last.getDate()
  const cells: Array<{ key: string, date: string | null, day: number | null }> = []
  for (let i = 0; i < startOffset; i++) cells.push({ key: `pad-start-${i}`, date: null, day: null })
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = dateKey(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, day)
    cells.push({ key: iso, date: iso, day })
  }
  while (cells.length % 7 !== 0) cells.push({ key: `pad-end-${cells.length}`, date: null, day: null })
  return cells
})
const eventsByDate = computed(() => {
  const map = new Map<string, Appointment[]>()
  for (const item of store.appointments) {
    const iso = zurichDateKey(item.startsAt)
    const list = map.get(iso) || []
    list.push(item)
    map.set(iso, list)
  }
  return map
})
const visibleAppointments = computed(() => {
  if (!selectedDate.value) return store.appointments
  return store.appointments.filter(item => zurichDateKey(item.startsAt) === selectedDate.value)
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
  if (new Date(form.endsAt).getTime() <= new Date(form.startsAt).getTime()) {
    toast.error('La fin du rendez-vous doit être après son début')
    return
  }
  submitting.value = true
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
    toast.success('Rendez-vous enregistré')
  } catch {
    toast.error('Le rendez-vous n’a pas pu être enregistré')
  }
  finally { submitting.value = false }
}

async function del(id: number) {
  if (!confirm('Supprimer ce rendez-vous ?')) return
  try {
    await store.remove(id)
    toast.success('Rendez-vous supprimé')
  } catch {
    toast.error('Le rendez-vous n’a pas pu être supprimé')
  }
}

async function loadAppointments(force = false) {
  loadError.value = ''
  try { await Promise.all([store.ensureLoaded(force), clients.ensureLoaded(force)]) }
  catch {
    loadError.value = isOffline.value
      ? 'L’agenda n’est pas disponible hors ligne et aucun cache local n’a été trouvé.'
      : 'L’agenda ne peut pas être chargé. Réessaie dans quelques instants.'
  }
}

onMounted(async () => {
  isOffline.value = !navigator.onLine
  onlineStateHandler = () => {
    isOffline.value = !navigator.onLine
    if (!isOffline.value) void store.flushQueue()
  }
  window.addEventListener('online', onlineStateHandler)
  window.addEventListener('offline', onlineStateHandler)
  await loadAppointments()
  if (route.query.new === '1') {
    openNew()
    const id = Number(route.query.clientId || 0)
    if (id) form.clientId = id
  }
  else {
    const appointmentId = Number(route.query.appointmentId || 0)
    const appointment = store.appointments.find(item => item.id === appointmentId)
    if (appointment) openEdit(appointment)
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
    <section class="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Agenda</span>
          <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Agenda</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Planifie et suis tes rendez-vous clients.</p>
          <p v-if="isOffline || store.pendingCount > 0 || store.syncing" class="mt-1 text-xs text-amber-500">
            <span v-if="store.syncing">Synchronisation en cours…</span>
            <span v-else-if="isOffline">Hors ligne : {{ store.pendingCount }} modification{{ store.pendingCount > 1 ? 's' : '' }} en attente</span>
            <span v-else>{{ store.pendingCount }} modification{{ store.pendingCount > 1 ? 's' : '' }} en attente</span>
          </p>
        </div>
        <button class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-gradient-brand px-4 text-sm font-semibold text-white shadow-glow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2" @click="openNew">Nouveau rendez-vous</button>
      </div>
    </section>

    <div v-if="store.loading && !store.loaded" role="status" class="grid min-h-48 place-items-center rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]"><div class="text-center"><div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /><p class="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement de l’agenda…</p></div></div>
    <div v-else-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100"><p class="font-semibold">L’agenda est indisponible</p><p class="mt-1 text-sm">{{ loadError }}</p><button type="button" class="mt-4 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white" @click="loadAppointments(true)">Réessayer</button></div>

    <div v-if="!store.loading && !loadError" class="rounded-xl border border-gray-100 bg-white p-3 dark:border-white/[0.06] dark:bg-[#111118] sm:p-4">
      <div class="flex items-center justify-between gap-2">
        <button class="grid h-11 w-11 place-items-center rounded-lg border border-gray-200 text-base dark:border-white/[0.12]" aria-label="Mois précédent" @click="previousMonth">←</button>
        <p class="text-sm font-semibold capitalize">{{ monthLabel }}</p>
        <button class="grid h-11 w-11 place-items-center rounded-lg border border-gray-200 text-base dark:border-white/[0.12]" aria-label="Mois suivant" @click="nextMonth">→</button>
      </div>
      <div class="mt-3 grid grid-cols-7 gap-1 text-center">
        <p v-for="day in weekdayLabels" :key="day" class="text-xs text-gray-600 dark:text-gray-300">{{ day }}</p>
        <button
          v-for="cell in monthMatrix"
          :key="cell.key"
          class="relative min-h-11 rounded-lg text-xs"
          :class="[
            !cell.date ? 'opacity-0 pointer-events-none' : 'hover:bg-gray-100 dark:hover:bg-white/[0.06]',
            selectedDate === cell.date ? 'bg-violet-600 text-white hover:bg-violet-600' : 'text-gray-700 dark:text-gray-200',
          ]"
          :aria-label="cell.date ? `Afficher les rendez-vous du ${cell.date}` : 'Jour hors du mois'"
          :disabled="!cell.date"
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
        <button v-if="selectedDate" class="min-h-11 rounded-lg px-3 text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10" @click="selectedDate = null">Réinitialiser</button>
      </div>
    </div>

    <AdminEmptyState v-if="!store.loading && !loadError && !visibleAppointments.length" :title="selectedDate ? 'Aucun rendez-vous ce jour-là' : 'Aucun rendez-vous planifié'" :body="selectedDate ? 'Choisis une autre date ou réinitialise le filtre.' : 'Ajoute un rendez-vous pour commencer à organiser ton agenda.'"><button v-if="!selectedDate" class="mt-2 min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700" @click="openNew">Planifier un rendez-vous</button></AdminEmptyState>

    <div v-if="!store.loading && !loadError && visibleAppointments.length" class="space-y-2 sm:hidden">
      <div
        v-for="item in visibleAppointments"
        :key="`m-${item.id}`"
        class="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111118] p-3"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold">{{ item.title }}</p>
          <span class="text-xs font-semibold uppercase text-gray-500">{{ item.status === 'scheduled' ? 'Planifié' : item.status === 'completed' ? 'Terminé' : 'Annulé' }}</span>
        </div>
        <p class="mt-1 text-xs text-gray-500">{{ item.clientId ? clientsById.get(item.clientId)?.name || '-' : '-' }}</p>
        <p class="mt-1 text-xs text-gray-500">Début: {{ formatDateTime(item.startsAt) }}</p>
        <p class="mt-1 text-xs text-gray-500">Fin: {{ formatDateTime(item.endsAt) }}</p>
        <div class="mt-3 grid grid-cols-3 gap-1 border-t border-gray-100 pt-3 dark:border-white/[0.06]">
          <button class="min-h-11 rounded-lg text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10" @click="downloadIcs(item)">Exporter ICS</button>
          <button class="min-h-11 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10" @click="openEdit(item)">Modifier</button>
          <button class="min-h-11 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" @click="del(item.id)">Supprimer</button>
        </div>
      </div>
    </div>

    <div v-if="!store.loading && !loadError && visibleAppointments.length" class="admin-table-wrap hidden overflow-x-auto rounded-xl border border-gray-100 bg-white dark:border-white/[0.06] dark:bg-[#111118] sm:block">
      <table class="admin-table w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="px-4 py-3 text-left text-xs uppercase text-gray-600 dark:text-gray-300">Titre</th>
            <th class="px-4 py-3 text-left text-xs uppercase text-gray-600 dark:text-gray-300">Client</th>
            <th class="px-4 py-3 text-left text-xs uppercase text-gray-600 dark:text-gray-300">Début</th>
            <th class="px-4 py-3 text-left text-xs uppercase text-gray-600 dark:text-gray-300">Fin</th>
            <th class="px-4 py-3 text-left text-xs uppercase text-gray-600 dark:text-gray-300">Statut</th>
            <th class="px-4 py-3 text-right text-xs uppercase text-gray-600 dark:text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in visibleAppointments" :key="item.id" class="border-b border-gray-50 dark:border-white/[0.03]">
            <td class="px-4 py-3 text-sm">{{ item.title }}</td>
            <td class="px-4 py-3 text-sm">{{ item.clientId ? clientsById.get(item.clientId)?.name || '-' : '-' }}</td>
            <td class="px-4 py-3 text-sm">{{ formatDateTime(item.startsAt) }}</td>
            <td class="px-4 py-3 text-sm">{{ formatDateTime(item.endsAt) }}</td>
            <td class="px-4 py-3 text-sm">{{ item.status === 'scheduled' ? 'Planifié' : item.status === 'completed' ? 'Terminé' : 'Annulé' }}</td>
            <td class="px-4 py-3 text-right"><div class="flex justify-end gap-1"><button class="min-h-11 rounded-lg px-3 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-300" @click="downloadIcs(item)">ICS</button><button class="min-h-11 rounded-lg px-3 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300" @click="openEdit(item)">Modifier</button><button class="min-h-11 rounded-lg px-3 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400" @click="del(item.id)">Supprimer</button></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Transition name="fade">
      <div v-if="showForm" ref="dialogRef" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="appointment-form-title" tabindex="-1" @keydown="handleDialogKeydown">
        <div class="absolute inset-0 bg-black/40" @click="showForm = false" />
        <form class="admin-modal-panel relative my-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-4 dark:bg-[#111118] sm:p-5" @submit.prevent="submit">
          <h2 id="appointment-form-title" class="font-semibold text-gray-900 dark:text-white">{{ editing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous' }}</h2>
          <div><label for="appointment-title" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Titre *</label><input id="appointment-title" v-model="form.title" class="input-field" placeholder="Ex. Point de lancement" required></div>
          <div><label for="appointment-client" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Client</label><select id="appointment-client" v-model.number="form.clientId" class="input-field">
            <option :value="null">Aucun client</option>
            <option v-for="c in clients.clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select></div>
          <div><label for="appointment-description" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Description</label><textarea id="appointment-description" v-model="form.description" rows="3" class="input-field" placeholder="Objectif ou ordre du jour" /></div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label for="appointment-start" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Début *</label><input id="appointment-start" v-model="form.startsAt" type="datetime-local" class="input-field" required></div>
            <div><label for="appointment-end" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Fin *</label><input id="appointment-end" v-model="form.endsAt" type="datetime-local" class="input-field" required></div>
          </div>
          <div><label for="appointment-location" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Lieu</label><input id="appointment-location" v-model="form.location" class="input-field" placeholder="Adresse ou lieu (optionnel)"></div>
          <div><label for="appointment-url" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Lien de visioconférence</label><input id="appointment-url" v-model="form.meetingUrl" type="url" class="input-field" placeholder="https://…"></div>
          <div><label for="appointment-status" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Statut</label><select id="appointment-status" v-model="form.status" class="input-field"><option value="scheduled">Planifié</option><option value="completed">Terminé</option><option value="cancelled">Annulé</option></select></div>
          <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end gap-2">
            <button type="button" class="min-h-11 rounded-lg px-4 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]" @click="showForm = false">Annuler</button>
            <button class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60" :disabled="submitting">{{ submitting ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
