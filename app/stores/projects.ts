import type { Project } from '~/types'

type ProjectRow = {
  id: number
  title: string
  slug: string
  category: Project['category']
  tags: string[] | null
  description: string
  image: string | null
  live_url: string | null
  code_url: string | null
  featured: boolean
  created_at: string
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    tags: row.tags ?? [],
    description: row.description,
    image: row.image,
    liveUrl: row.live_url,
    codeUrl: row.code_url,
    featured: row.featured,
    createdAt: row.created_at?.slice(0, 10) ?? '',
  }
}

export const useProjectsStore = defineStore('projects', () => {
  const auth = useAuthStore()
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function ensureLoaded(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const rows = await $fetch<ProjectRow[]>('/api/projects')
      projects.value = rows.map(mapProject)
      loaded.value = true
    }
    finally {
      loading.value = false
    }
  }

  async function add(project: Omit<Project, 'id' | 'createdAt'>) {
    const row = await $fetch<ProjectRow>('/api/projects', {
      method: 'POST',
      body: project,
      headers: auth.authHeader(),
    })
    const mapped = mapProject(row)
    projects.value.unshift(mapped)
    return mapped
  }

  async function update(id: number, data: Partial<Project>) {
    const payload = { ...data, id }
    const row = await $fetch<ProjectRow>('/api/projects', {
      method: 'PUT',
      body: payload,
      headers: auth.authHeader(),
    })
    const idx = projects.value.findIndex(p => p.id === id)
    if (idx !== -1) projects.value[idx] = mapProject(row)
  }

  async function remove(id: number) {
    await $fetch('/api/projects', {
      method: 'DELETE',
      query: { id },
      headers: auth.authHeader(),
    })
    projects.value = projects.value.filter(p => p.id !== id)
  }

  const featured = computed(() => projects.value.filter(p => p.featured))
  const byCategory = (cat: string) => projects.value.filter(p => cat === 'all' || p.category === cat)

  return { projects, loading, loaded, ensureLoaded, add, update, remove, featured, byCategory }
})
