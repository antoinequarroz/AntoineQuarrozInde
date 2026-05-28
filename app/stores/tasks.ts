import type { Task } from '~/types'

type TaskRow = {
  id: number
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  client_id: number | null
  project_id: number | null
  created_at: string
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    clientId: row.client_id,
    projectId: row.project_id,
    createdAt: row.created_at?.slice(0, 10) ?? '',
  }
}

export const useTasksStore = defineStore('tasks', () => {
  const auth = useAuthStore()
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function ensureLoaded(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const rows = await $fetch<TaskRow[]>('/api/tasks', {
        headers: auth.authHeader(),
      })
      tasks.value = rows.map(mapTask)
      loaded.value = true
    }
    finally {
      loading.value = false
    }
  }

  async function add(task: Omit<Task, 'id' | 'createdAt'>) {
    const row = await $fetch<TaskRow>('/api/tasks', {
      method: 'POST',
      body: task,
      headers: auth.authHeader(),
    })
    const mapped = mapTask(row)
    tasks.value.unshift(mapped)
    return mapped
  }

  async function update(id: number, data: Partial<Task>) {
    const row = await $fetch<TaskRow>('/api/tasks', {
      method: 'PUT',
      body: { ...data, id },
      headers: auth.authHeader(),
    })
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx !== -1) tasks.value[idx] = mapTask(row)
  }

  async function remove(id: number) {
    await $fetch('/api/tasks', {
      method: 'DELETE',
      query: { id },
      headers: auth.authHeader(),
    })
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  const done = computed(() => tasks.value.filter(t => t.status === 'done'))
  const todo = computed(() => tasks.value.filter(t => t.status !== 'done'))

  return { tasks, done, todo, loading, loaded, ensureLoaded, add, update, remove }
})
