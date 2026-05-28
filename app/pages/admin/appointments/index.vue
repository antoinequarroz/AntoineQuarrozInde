<script setup lang="ts">
import type { Appointment } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useAppointmentsStore()
const clients = useClientsStore()
const toast = useToast()
const showForm = ref(false)
const editing = ref<Appointment | null>(null)
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

onMounted(() => Promise.all([store.ensureLoaded(), clients.ensureLoaded()]))
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="font-display font-semibold text-xl">Agenda</h1>
      <button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm" @click="openNew">Nouveau RDV</button>
    </div>

    <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="w-full">
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
          <tr v-for="item in store.appointments" :key="item.id" class="border-b border-gray-50 dark:border-white/[0.03]">
            <td class="px-4 py-3 text-sm">{{ item.title }}</td>
            <td class="px-4 py-3 text-sm">{{ item.clientId ? clientsById.get(item.clientId)?.name || '-' : '-' }}</td>
            <td class="px-4 py-3 text-sm">{{ item.startsAt }}</td>
            <td class="px-4 py-3 text-sm">{{ item.endsAt }}</td>
            <td class="px-4 py-3 text-sm">{{ item.status }}</td>
            <td class="px-4 py-3 text-right space-x-2">
              <button class="text-xs text-violet-600" @click="openEdit(item)">Editer</button>
              <button class="text-xs text-red-500" @click="del(item.id)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showForm = false" />
        <form class="relative w-full max-w-xl bg-white dark:bg-[#111118] rounded-xl p-5 space-y-3" @submit.prevent="submit">
          <input v-model="form.title" class="input-field" placeholder="Titre" required>
          <select v-model.number="form.clientId" class="input-field">
            <option :value="null">Aucun client</option>
            <option v-for="c in clients.clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <textarea v-model="form.description" rows="3" class="input-field" placeholder="Description" />
          <div class="grid grid-cols-2 gap-3">
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
          <div class="flex justify-end gap-2">
            <button type="button" class="px-3 py-2 text-sm" @click="showForm = false">Annuler</button>
            <button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Enregistrer</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
