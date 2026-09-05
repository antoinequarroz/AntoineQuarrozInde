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

type TaskUpsert = Omit<Task, 'id' | 'createdAt'>
type PendingOperation =
  | { type: 'add'; tempId: number; payload: TaskUpsert }
  | { type: 'update'; id: number; payload: Partial<Task> }
  | { type: 'delete'; id: number }

const TASKS_CACHE_KEY = 'aq_tasks_cache_v1'
const TASKS_QUEUE_KEY = 'aq_tasks_queue_v1'
const TASKS_TEMP_ID_KEY = 'aq_tasks_temp_id_v1'

function isOnline() {
  if (!import.meta.client) return true
  return navigator.onLine
}

export const useTasksStore = defineStore('tasks', () => {
  const auth = useAuthStore()
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const loaded = ref(false)
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
    localStorage.setItem(storageKey(TASKS_CACHE_KEY), JSON.stringify(tasks.value))
  }

  function persistQueue() {
    if (!import.meta.client) return
    localStorage.setItem(storageKey(TASKS_QUEUE_KEY), JSON.stringify(pendingQueue.value))
  }

  function loadLocalState() {
    if (!import.meta.client) return
    tasks.value = []
    pendingQueue.value = []
    try {
      const rawTasks = localStorage.getItem(storageKey(TASKS_CACHE_KEY))
      if (rawTasks) tasks.value = JSON.parse(rawTasks)
    } catch {}
    try {
      const rawQueue = localStorage.getItem(storageKey(TASKS_QUEUE_KEY))
      if (rawQueue) pendingQueue.value = JSON.parse(rawQueue)
    } catch {}
  }

  function nextTempId() {
    if (!import.meta.client) return -Date.now()
    const key = storageKey(TASKS_TEMP_ID_KEY)
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
        loaded.value = tasks.value.length > 0
        loadedContext.value = context
        if (!loaded.value) throw new Error('Tâches indisponibles hors ligne : aucun cache local.')
        return
      }
      const rows = await $fetch<TaskRow[]>('/api/tasks', {
        headers: auth.authHeader(),
      })
      if (version !== requestVersion) return
      tasks.value = rows.map(mapTask)
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

  async function add(task: TaskUpsert) {
    if (!isOnline()) {
      const tempId = nextTempId()
      const optimistic: Task = {
        id: tempId,
        title: task.title,
        description: task.description ?? null,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ?? null,
        clientId: task.clientId ?? null,
        projectId: task.projectId ?? null,
        createdAt: new Date().toISOString().slice(0, 10),
      }
      tasks.value.unshift(optimistic)
      queueOp({ type: 'add', tempId, payload: task })
      persistCache()
      return optimistic
    }
    const row = await $fetch<TaskRow>('/api/tasks', {
      method: 'POST',
      body: task,
      headers: auth.authHeader(),
    })
    const mapped = mapTask(row)
    tasks.value.unshift(mapped)
    persistCache()
    return mapped
  }

  async function update(id: number, data: Partial<Task>) {
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      const current = tasks.value[idx]
      if (current) tasks.value[idx] = { ...current, ...data }
      persistCache()
    }
    if (!isOnline()) {
      const addOpIdx = pendingQueue.value.findIndex(op => op.type === 'add' && op.tempId === id)
      if (addOpIdx !== -1) {
        const existing = pendingQueue.value[addOpIdx] as Extract<PendingOperation, { type: 'add' }>
        pendingQueue.value[addOpIdx] = { ...existing, payload: { ...existing.payload, ...data } }
        persistQueue()
        return
      }
      queueOp({ type: 'update', id, payload: data })
      return
    }
    const row = await $fetch<TaskRow>('/api/tasks', {
      method: 'PUT',
      body: { ...data, id },
      headers: auth.authHeader(),
    })
    if (idx !== -1) tasks.value[idx] = mapTask(row)
    persistCache()
  }

  async function remove(id: number) {
    tasks.value = tasks.value.filter(t => t.id !== id)
    persistCache()
    if (!isOnline()) {
      const before = pendingQueue.value.length
      pendingQueue.value = pendingQueue.value.filter(op => !(op.type === 'add' && op.tempId === id))
      if (pendingQueue.value.length === before) queueOp({ type: 'delete', id })
      else persistQueue()
      return
    }
    await $fetch('/api/tasks', {
      method: 'DELETE',
      query: { id },
      headers: auth.authHeader(),
    })
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
          const row = await $fetch<TaskRow>('/api/tasks', {
            method: 'POST',
            body: op.payload,
            headers: auth.authHeader(),
          })
          const mapped = mapTask(row)
          const localIdx = tasks.value.findIndex(t => t.id === op.tempId)
          if (localIdx !== -1) tasks.value[localIdx] = mapped
          mapping.set(op.tempId, mapped.id)
        }
        if (op.type === 'update') {
          const finalId = mapping.get(op.id) ?? op.id
          if (finalId > 0) {
            const row = await $fetch<TaskRow>('/api/tasks', {
              method: 'PUT',
              body: { ...op.payload, id: finalId },
              headers: auth.authHeader(),
            })
            const idx = tasks.value.findIndex(t => t.id === finalId)
            if (idx !== -1) tasks.value[idx] = mapTask(row)
          }
        }
        if (op.type === 'delete') {
          const finalId = mapping.get(op.id) ?? op.id
          if (finalId > 0) {
            await $fetch('/api/tasks', {
              method: 'DELETE',
              query: { id: finalId },
              headers: auth.authHeader(),
            })
            tasks.value = tasks.value.filter(t => t.id !== finalId)
          }
        }
        persistQueue()
        persistCache()
      }
    }
    finally {
      syncing.value = false
    }
  }

  const done = computed(() => tasks.value.filter(t => t.status === 'done'))
  const todo = computed(() => tasks.value.filter(t => t.status !== 'done'))

  const pendingCount = computed(() => pendingQueue.value.length)

  return { tasks, done, todo, loading, loaded, syncing, pendingCount, ensureLoaded, add, update, remove, flushQueue }
})
