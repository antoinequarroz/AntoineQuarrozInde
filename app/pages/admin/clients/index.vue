<script setup lang="ts">
import type { Client } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useClientsStore()
const toast = useToast()

const showForm = ref(false)
const editing = ref<Client | null>(null)
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

onMounted(() => store.ensureLoaded())
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

    <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase">Nom</th>
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase hidden sm:table-cell">Contact</th>
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase">Statut</th>
            <th class="text-right px-5 py-3 text-xs text-gray-400 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in store.clients" :key="client.id" class="border-b border-gray-50 dark:border-white/[0.03] last:border-0">
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
              <button class="text-xs text-violet-600" @click="openEdit(client)">Editer</button>
              <button class="text-xs text-red-500" @click="handleDelete(client.id)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showForm = false" />
        <form class="relative w-full max-w-xl bg-white dark:bg-[#111118] rounded-xl p-5 space-y-3" @submit.prevent="handleSubmit">
          <h2 class="font-semibold text-gray-900 dark:text-white">{{ editing ? 'Modifier client' : 'Nouveau client' }}</h2>
          <div class="grid grid-cols-2 gap-3">
            <input v-model="form.name" class="input-field" placeholder="Nom" required>
            <input v-model="form.company" class="input-field" placeholder="Societe">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <input v-model="form.email" type="email" class="input-field" placeholder="Email" required>
            <input v-model="form.phone" class="input-field" placeholder="Telephone">
          </div>
          <select v-model="form.status" class="input-field">
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <textarea v-model="form.notes" rows="3" class="input-field" placeholder="Notes" />
          <div class="flex justify-end gap-2">
            <button type="button" class="px-3 py-2 text-sm" @click="showForm = false">Annuler</button>
            <button type="submit" class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Enregistrer</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
