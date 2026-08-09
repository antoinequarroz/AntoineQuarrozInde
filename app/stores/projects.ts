import type { Project, ProjectResult } from '~/types'

type ProjectRow = {
  id: number
  client_id?: number | null
  title: string
  slug: string
  category: Project['category']
  tags: string[] | null
  description: string
  image: string | null
  live_url: string | null
  code_url: string | null
  featured: boolean
  case_study_published?: boolean | null
  client_label?: string | null
  project_role?: string | null
  project_duration?: string | null
  completed_at?: string | null
  challenge?: string | null
  approach?: string | null
  solution?: string | null
  outcome?: string | null
  deliverables?: string[] | null
  gallery_images?: string[] | null
  results?: ProjectResult[] | null
  seo_title?: string | null
  seo_description?: string | null
  workflow_status?: Project['workflowStatus']
  starts_at?: string | null
  target_at?: string | null
  budget_cents?: number
  internal_hourly_cost_cents?: number
  created_at: string
}


function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    clientId: row.client_id ?? null,
    title: row.title,
    slug: row.slug,
    category: row.category,
    tags: row.tags ?? [],
    description: row.description,
    image: row.image,
    liveUrl: row.live_url,
    codeUrl: row.code_url,
    featured: row.featured,
    caseStudyPublished: Boolean(row.case_study_published),
    clientLabel: row.client_label ?? null,
    projectRole: row.project_role ?? null,
    projectDuration: row.project_duration ?? null,
    completedAt: row.completed_at ?? null,
    challenge: row.challenge ?? null,
    approach: row.approach ?? null,
    solution: row.solution ?? null,
    outcome: row.outcome ?? null,
    deliverables: row.deliverables ?? [],
    galleryImages: row.gallery_images ?? [],
    results: Array.isArray(row.results) ? row.results : [],
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    workflowStatus: row.workflow_status ?? 'planning',
    startsAt: row.starts_at ?? null,
    targetAt: row.target_at ?? null,
    budgetCents: row.budget_cents ?? 0,
    internalHourlyCostCents: row.internal_hourly_cost_cents ?? 0,
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
      const rows = await $fetch<ProjectRow[]>('/api/projects', { headers: auth.authHeader() })
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
