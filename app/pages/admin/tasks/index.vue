<script setup lang="ts">
import type { Task } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useTasksStore()
const toast = useToast()

const showForm = ref(false)
const editing = ref<Task | null>(null)
const isOffline = ref(false)
let onlineStateHandler: (() => void) | null = null
const form = reactive({
  title: '',
  description: '',
  status: 'todo' as Task['status'],
  priority: 'medium' as Task['priority'],
  dueDate: '',
})

function resetForm() {
  Object.assign(form, { title: '', description: '', status: 'todo', priority: 'medium', dueDate: '' })
}

function openNew() {
  editing.value = null
  resetForm()
  showForm.value = true
}

function openEdit(task: Task) {
  editing.value = task
  Object.assign(form, {
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate || '',
  })
  showForm.value = true
}

async function handleSubmit() {
  const payload = {
    title: form.title,
    description: form.description || null,
    status: form.status,
    priority: form.priority,
    dueDate: form.dueDate || null,
    clientId: null,
    projectId: null,
  }
  try {
    if (editing.value) {
      await store.update(editing.value.id, payload as any)
      toast.success('Tache mise a jour')
    } else {
      await store.add(payload as any)
      toast.success('Tache creee')
    }
    showForm.value = false
  } catch {
    toast.error('Erreur de sauvegarde')
  }
}

async function handleDelete(id: number) {
  if (!confirm('Supprimer cette tache ?')) return
  try {
    await store.remove(id)
    toast.success('Tache supprimee')
  } catch {
    toast.error('Erreur de suppression')
  }
}

onMounted(() => store.ensureLoaded())

onMounted(() => {
  isOffline.value = !navigator.onLine
  onlineStateHandler = () => {
    isOffline.value = !navigator.onLine
    if (!isOffline.value) void store.flushQueue()
  }
  window.addEventListener('online', onlineStateHandler)
  window.addEventListener('offline', onlineStateHandler)
})

onBeforeUnmount(() => {
  if (!onlineStateHandler) return
  window.removeEventListener('online', onlineStateHandler)
  window.removeEventListener('offline', onlineStateHandler)
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="font-display font-semibold text-xl text-gray-900 dark:text-white">Taches</h1>
        <p class="text-sm text-gray-400 mt-0.5">{{ store.tasks.length }} tache(s), {{ store.done.length }} terminee(s)</p>
        <p v-if="isOffline || store.pendingCount > 0 || store.syncing" class="text-xs text-amber-500 mt-1">
          <span v-if="store.syncing">Synchronisation en cours...</span>
          <span v-else-if="isOffline">Hors ligne: modifications en attente ({{ store.pendingCount }})</span>
          <span v-else>Modifications en attente: {{ store.pendingCount }}</span>
        </p>
      </div>
      <button class="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white" @click="openNew">Nouvelle</button>
    </div>

    <div class="admin-table-wrap bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden overflow-x-auto">
      <table class="admin-table w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase">Titre</th>
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase">Statut</th>
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase hidden sm:table-cell">Priorite</th>
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase hidden sm:table-cell">Echeance</th>
            <th class="text-right px-5 py-3 text-xs text-gray-400 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in store.tasks" :key="task.id" class="border-b border-gray-50 dark:border-white/[0.03] last:border-0">
            <td class="px-5 py-3">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ task.title }}</p>
              <p class="text-xs text-gray-400 line-clamp-1">{{ task.description || '-' }}</p>
            </td>
            <td class="px-5 py-3">
              <span class="text-xs px-2 py-1 rounded-md"
                :class="task.status === 'done' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' : task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300'">
                {{ task.status }}
              </span>
            </td>
            <td class="px-5 py-3 hidden sm:table-cell text-xs text-gray-500">{{ task.priority }}</td>
            <td class="px-5 py-3 hidden sm:table-cell text-xs text-gray-500">{{ task.dueDate || '-' }}</td>
            <td class="px-5 py-3 text-right space-x-2">
              <button class="text-xs text-violet-600" @click="openEdit(task)">Editer</button>
              <button class="text-xs text-red-500" @click="handleDelete(task.id)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="showForm = false" />
        <form class="admin-modal-panel relative w-full max-w-xl bg-white dark:bg-[#111118] rounded-xl p-5 space-y-3" @submit.prevent="handleSubmit">
          <h2 class="font-semibold text-gray-900 dark:text-white">{{ editing ? 'Modifier tache' : 'Nouvelle tache' }}</h2>
          <input v-model="form.title" class="input-field" placeholder="Titre" required>
          <textarea v-model="form.description" rows="3" class="input-field" placeholder="Description" />
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select v-model="form.status" class="input-field">
              <option value="todo">Todo</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <select v-model="form.priority" class="input-field">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input v-model="form.dueDate" type="date" class="input-field">
          </div>
          <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end gap-2">
            <button type="button" class="px-3 py-2 text-sm" @click="showForm = false">Annuler</button>
            <button type="submit" class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Enregistrer</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
