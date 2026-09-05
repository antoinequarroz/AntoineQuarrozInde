<script setup lang="ts">
import type { Task } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useTasksStore()
const toast = useToast()
const { statusLabel } = useBusinessLabels()
const route = useRoute()

const showForm = ref(false)
const closeForm = () => { showForm.value = false }
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(showForm, closeForm)
const editing = ref<Task | null>(null)
const isOffline = ref(false)
const loadError = ref('')
const submitting = ref(false)
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
  submitting.value = true
  try {
    if (editing.value) {
      await store.update(editing.value.id, payload as any)
      toast.success('Tâche mise à jour')
    } else {
      await store.add(payload as any)
      toast.success('Tâche créée')
    }
    showForm.value = false
  } catch {
    toast.error('La tâche n’a pas pu être enregistrée')
  }
  finally { submitting.value = false }
}

async function handleDelete(id: number) {
  if (!confirm('Supprimer cette tâche ?')) return
  try {
    await store.remove(id)
    toast.success('Tâche supprimée')
  } catch {
    toast.error('La tâche n’a pas pu être supprimée')
  }
}

async function loadTasks(force = false) {
  loadError.value = ''
  try {
    await store.ensureLoaded(force)
  }
  catch {
    loadError.value = isOffline.value
      ? 'Les tâches ne sont pas disponibles hors ligne et aucun cache local n’a été trouvé.'
      : 'Les tâches ne peuvent pas être chargées. Réessaie dans quelques instants.'
  }
}

onMounted(async () => {
  await loadTasks()
  if (route.query.new === '1') {
    openNew()
    return
  }
  const taskId = Number(route.query.taskId || 0)
  const task = store.tasks.find(item => item.id === taskId)
  if (task) openEdit(task)
})

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
    <section class="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Tâches</span>
          <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Tâches</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ store.tasks.length }} tâche{{ store.tasks.length > 1 ? 's' : '' }} · {{ store.done.length }} terminée{{ store.done.length > 1 ? 's' : '' }}</p>
          <p v-if="isOffline || store.pendingCount > 0 || store.syncing" class="mt-1 text-xs text-amber-500">
            <span v-if="store.syncing">Synchronisation en cours…</span>
            <span v-else-if="isOffline">Hors ligne : {{ store.pendingCount }} modification{{ store.pendingCount > 1 ? 's' : '' }} en attente</span>
            <span v-else>{{ store.pendingCount }} modification{{ store.pendingCount > 1 ? 's' : '' }} en attente</span>
          </p>
        </div>
        <button class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-gradient-brand px-4 text-sm font-semibold text-white shadow-glow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2" @click="openNew">Nouvelle tâche</button>
      </div>
    </section>

    <div v-if="store.loading && !store.loaded" role="status" aria-live="polite" class="grid min-h-56 place-items-center rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="text-center"><div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /><p class="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement des tâches…</p></div>
    </div>

    <div v-else-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100">
      <p class="font-semibold">Les tâches sont indisponibles</p>
      <p class="mt-1 text-sm">{{ loadError }}</p>
      <button type="button" class="mt-4 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2" @click="loadTasks(true)">Réessayer</button>
    </div>

    <AdminEmptyState v-else-if="!store.tasks.length" title="Aucune tâche planifiée" body="Crée ta première tâche pour organiser le prochain travail à réaliser.">
      <button type="button" class="mt-2 min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-400/30 dark:text-violet-200 dark:hover:bg-violet-500/10" @click="openNew">Créer une tâche</button>
    </AdminEmptyState>

    <div v-if="!store.loading && !loadError && store.tasks.length" class="space-y-2 sm:hidden">
      <article v-for="task in store.tasks" :key="`mobile-${task.id}`" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0"><h2 class="font-semibold text-gray-900 dark:text-white">{{ task.title }}</h2><p v-if="task.description" class="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{{ task.description }}</p></div>
          <span class="shrink-0 rounded-md px-2 py-1 text-xs font-semibold" :class="task.status === 'done' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' : task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200'">{{ statusLabel(task.status) }}</span>
        </div>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt class="text-gray-400">Priorité</dt><dd class="mt-1 font-medium text-gray-700 dark:text-gray-200">{{ task.priority === 'high' ? 'Haute' : task.priority === 'low' ? 'Basse' : 'Moyenne' }}</dd></div><div><dt class="text-gray-400">Échéance</dt><dd class="mt-1 font-medium text-gray-700 dark:text-gray-200">{{ task.dueDate || 'Non définie' }}</dd></div></dl>
        <div class="mt-3 flex gap-2 border-t border-gray-100 pt-3 dark:border-white/[0.06]"><button type="button" class="min-h-11 flex-1 rounded-lg text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10" @click="openEdit(task)">Modifier</button><button type="button" class="min-h-11 flex-1 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" @click="handleDelete(task.id)">Supprimer</button></div>
      </article>
    </div>

    <div v-if="!store.loading && !loadError && store.tasks.length" class="admin-table-wrap hidden overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/[0.06] dark:bg-[#111118] sm:block">
      <table class="admin-table w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase">Titre</th>
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase">Statut</th>
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase hidden sm:table-cell">Priorité</th>
            <th class="text-left px-5 py-3 text-xs text-gray-400 uppercase hidden sm:table-cell">Échéance</th>
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
                {{ statusLabel(task.status) }}
              </span>
            </td>
            <td class="px-5 py-3 hidden sm:table-cell text-xs text-gray-500">{{ task.priority === 'high' ? 'Haute' : task.priority === 'low' ? 'Basse' : 'Moyenne' }}</td>
            <td class="px-5 py-3 hidden sm:table-cell text-xs text-gray-500">{{ task.dueDate || 'Non définie' }}</td>
            <td class="px-5 py-3 text-right">
              <div class="flex justify-end gap-1"><button class="min-h-11 rounded-lg px-3 text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10" @click="openEdit(task)">Modifier</button><button class="min-h-11 rounded-lg px-3 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" @click="handleDelete(task.id)">Supprimer</button></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Transition name="fade">
      <div v-if="showForm" ref="dialogRef" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="task-form-title" tabindex="-1" @keydown="handleDialogKeydown">
        <div class="absolute inset-0 bg-black/40" @click="showForm = false" />
        <form class="admin-modal-panel relative my-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-xl space-y-4 overflow-y-auto rounded-xl bg-white p-4 dark:bg-[#111118] sm:p-5" @submit.prevent="handleSubmit">
          <h2 id="task-form-title" class="font-display text-lg font-semibold text-gray-900 dark:text-white">{{ editing ? 'Modifier la tâche' : 'Nouvelle tâche' }}</h2>
          <div><label for="task-title" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Titre *</label><input id="task-title" v-model="form.title" class="input-field" placeholder="Ex. Préparer la maquette" required></div>
          <div><label for="task-description" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Description</label><textarea id="task-description" v-model="form.description" rows="3" class="input-field" placeholder="Contexte ou résultat attendu" /></div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label for="task-status" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Statut</label><select id="task-status" v-model="form.status" class="input-field">
              <option value="todo">{{ statusLabel('todo') }}</option>
              <option value="in_progress">{{ statusLabel('in_progress') }}</option>
              <option value="done">{{ statusLabel('done') }}</option>
            </select></div>
            <div><label for="task-priority" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Priorité</label><select id="task-priority" v-model="form.priority" class="input-field"><option value="low">Basse</option><option value="medium">Moyenne</option><option value="high">Haute</option></select></div>
            <div><label for="task-due-date" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Échéance</label><input id="task-due-date" v-model="form.dueDate" type="date" class="input-field"></div>
          </div>
          <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end gap-2">
            <button type="button" class="min-h-11 rounded-lg px-4 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]" @click="showForm = false">Annuler</button>
            <button type="submit" class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60" :disabled="submitting">{{ submitting ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>
