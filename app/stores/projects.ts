import type { Project, ProjectResult } from '~/types'

type ProjectRow = {
  id: number
  client_id?: number | null
  title: string
  slug: string
  category: Project['category']
  tags: string[] | null
  description: string
  description_en?: string | null
  description_de?: string | null
  image: string | null
  live_url: string | null
  code_url: string | null
  case_study_live_url?: string | null
  case_study_code_url?: string | null
  featured: boolean
  portfolio_visible?: boolean | null
  case_study_published?: boolean | null
  case_study_approved_at?: string | null
  case_study_approved_by?: string | null
  client_label?: string | null
  client_disclosure_status?: Project['clientDisclosureStatus'] | null
  project_role?: string | null
  project_duration?: string | null
  case_study_timeline_approved?: boolean | null
  completed_at?: string | null
  challenge?: string | null
  project_scope?: string | null
  key_decisions?: string | null
  approach?: string | null
  solution?: string | null
  outcome?: string | null
  outcome_approved?: boolean | null
  case_study_links_approved?: boolean | null
  related_service_paths?: Project['relatedServicePaths'] | null
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
    descriptionEn: row.description_en ?? null,
    descriptionDe: row.description_de ?? null,
    image: row.image,
    liveUrl: row.live_url,
    codeUrl: row.code_url,
    caseStudyLiveUrl: row.case_study_live_url ?? null,
    caseStudyCodeUrl: row.case_study_code_url ?? null,
    featured: row.featured,
    portfolioVisible: Boolean(row.portfolio_visible),
    caseStudyPublished: Boolean(row.case_study_published),
    caseStudyApprovedAt: row.case_study_approved_at ?? null,
    caseStudyApprovedBy: row.case_study_approved_by ?? null,
    clientLabel: row.client_label ?? null,
    clientDisclosureStatus: row.client_disclosure_status ?? 'pending',
    projectRole: row.project_role ?? null,
    projectDuration: row.project_duration ?? null,
    caseStudyTimelineApproved: Boolean(row.case_study_timeline_approved),
    completedAt: row.completed_at ?? null,
    challenge: row.challenge ?? null,
    projectScope: row.project_scope ?? null,
    keyDecisions: row.key_decisions ?? null,
    approach: row.approach ?? null,
    solution: row.solution ?? null,
    outcome: row.outcome ?? null,
    outcomeApproved: Boolean(row.outcome_approved),
    caseStudyLinksApproved: Boolean(row.case_study_links_approved),
    relatedServicePaths: row.related_service_paths ?? [],
    deliverables: row.deliverables ?? [],
    galleryImages: row.gallery_images ?? [],
    results: Array.isArray(row.results)
      ? row.results.map(result => ({
          value: result.value,
          label: result.label,
          measurementContext: result.measurementContext ?? null,
          evidenceNote: result.evidenceNote ?? null,
          approved: result.approved === true,
        }))
      : [],
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
  const loadedContext = ref<string | null>(null)
  const loadingContext = ref<string | null>(null)
  let requestVersion = 0
  let activeLoad: Promise<void> | null = null

  function requestContext() {
    return auth.accessToken
      ? `authenticated:${auth.userEmail ?? ''}:${auth.currentOrganizationId ?? ''}`
      : 'public'
  }

  function ensureLoaded(force = false) {
    const context = requestContext()
    if (loading.value && loadingContext.value === context && activeLoad) return activeLoad
    if (loaded.value && loadedContext.value === context && !force) return Promise.resolve()

    const version = ++requestVersion
    loading.value = true
    loadingContext.value = context
    const load = (async () => {
      const rows = await $fetch<ProjectRow[]>('/api/projects', { headers: auth.authHeader() })
      if (version !== requestVersion) return
      projects.value = rows.map(mapProject)
      loaded.value = true
      loadedContext.value = context
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

  async function add(project: Omit<Project, 'id' | 'createdAt' | 'caseStudyApprovedAt' | 'caseStudyApprovedBy'> & { caseStudyApprovalConfirmed?: boolean }) {
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
  const portfolio = computed(() => projects.value.filter(p => p.portfolioVisible))
  const byCategory = (cat: string) => portfolio.value.filter(p => cat === 'all' || p.category === cat)

  return { projects, loading, loaded, ensureLoaded, add, update, remove, featured, portfolio, byCategory }
})
