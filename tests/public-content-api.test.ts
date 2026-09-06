import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import {
  LEGACY_PUBLIC_PROJECT_COLUMNS,
  PUBLIC_ARTICLE_COLUMNS,
  PUBLIC_PROJECT_COLUMNS,
  serializePublicArticle,
  serializePublicProject,
} from '../server/utils/publicContent'

type Row = Record<string, any>

function createQuery(rows: Row[]) {
  let projection = '*'
  const filters: Array<(row: Row) => boolean> = []

  const query: Record<string, any> = {
    select: vi.fn((columns: string) => {
      projection = columns
      return query
    }),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push(row => row[column] === value)
      return query
    }),
    or: vi.fn((expression: string) => {
      expect(expression).toBe('portfolio_visible.eq.true,and(case_study_published.eq.true,case_study_approved_at.not.is.null)')
      filters.push(row => row.portfolio_visible === true || (row.case_study_published === true && row.case_study_approved_at))
      return query
    }),
    order: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) => {
      const columns = projection === '*' ? null : projection.split(',')
      const data = rows.filter(row => filters.every(filter => filter(row))).map((row) => {
        if (!columns) return row
        return Object.fromEntries(columns.map(column => [column, row[column]]))
      })
      return Promise.resolve(resolve({ data, error: null }))
    },
  }

  return query
}

async function callRoute(
  route: 'articles' | 'projects',
  role: string | null,
  rows: Row[],
  organizationId = 'org-public',
) {
  const query = createQuery(rows)
  const from = vi.fn(() => query)

  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('resolveOrganizationContext', vi.fn().mockResolvedValue({ id: organizationId, role }))
  vi.stubGlobal('getSupabaseAdmin', () => ({ from }))
  vi.stubGlobal('requireAdminMfa', vi.fn().mockResolvedValue(undefined))
  vi.stubGlobal('isPublicContentRole', (value: string | null | undefined) => !value || value === 'client')
  vi.stubGlobal('PUBLIC_ARTICLE_COLUMNS', PUBLIC_ARTICLE_COLUMNS)
  vi.stubGlobal('PUBLIC_PROJECT_COLUMNS', PUBLIC_PROJECT_COLUMNS)
  vi.stubGlobal('serializePublicArticle', serializePublicArticle)
  vi.stubGlobal('serializePublicProject', serializePublicProject)

  const { default: handler } = route === 'articles'
    ? await import('../server/api/articles.get')
    : await import('../server/api/projects.get')
  const result = await handler({ context: {} } as never)

  return { from, query, result: result as Row[] }
}

const articleRows = [
  {
    id: 1,
    organization_id: 'org-public',
    title: 'Publié',
    slug: 'publie',
    excerpt: 'Visible',
    content: 'Contenu public',
    cover_image: null,
    published: true,
    author_key: 'antoine-quarroz',
    published_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T11:00:00Z',
    tags: ['SEO'],
    created_at: '2026-09-01T10:00:00Z',
    read_time: 4,
    internal_note: 'secret',
  },
  {
    id: 2,
    organization_id: 'org-public',
    title: 'Brouillon',
    slug: 'brouillon',
    excerpt: 'Privé',
    content: 'Contenu privé',
    cover_image: null,
    published: false,
    author_key: 'antoine-quarroz',
    published_at: null,
    updated_at: '2026-09-02T11:00:00Z',
    tags: [],
    created_at: '2026-09-02T10:00:00Z',
    read_time: 3,
    internal_note: 'secret',
  },
  {
    id: 3,
    organization_id: 'org-other',
    title: 'Autre tenant',
    slug: 'autre-tenant',
    excerpt: 'Interdit',
    content: 'Interdit',
    cover_image: null,
    published: true,
    author_key: 'antoine-quarroz',
    published_at: '2026-09-03T10:00:00Z',
    updated_at: '2026-09-03T11:00:00Z',
    tags: [],
    created_at: '2026-09-03T10:00:00Z',
    read_time: 2,
  },
]

const publicArticleKeys = [
  'author_key',
  'content',
  'cover_image',
  'created_at',
  'excerpt',
  'id',
  'published',
  'published_at',
  'read_time',
  'slug',
  'tags',
  'title',
  'updated_at',
]

const projectRows = [
  [false, false],
  [true, false],
  [false, true],
  [true, true],
].map(([portfolioVisible, caseStudyPublished], index) => ({
  id: index + 1,
  organization_id: 'org-public',
  client_id: 900 + index,
  title: `Projet ${index + 1}`,
  slug: `projet-${index + 1}`,
  category: 'web',
  tags: ['Nuxt'],
  description: 'Description',
  description_en: null,
  description_de: null,
  image: '/image.webp',
  live_url: 'https://example.com',
  code_url: null,
  featured: false,
  portfolio_visible: portfolioVisible,
  case_study_published: caseStudyPublished,
  case_study_published_at: caseStudyPublished ? `2026-08-0${index + 1}T10:00:00Z` : null,
  case_study_approved_at: caseStudyPublished ? `2026-08-0${index + 1}T10:00:00Z` : null,
  client_label: 'Attribution publique',
  client_disclosure_status: 'approved',
  project_role: 'Développement',
  project_duration: '3 mois',
  case_study_timeline_approved: true,
  completed_at: '2026-08-01',
  challenge: 'Détail étude',
  project_scope: 'Périmètre',
  key_decisions: 'Décisions',
  approach: 'Approche',
  solution: 'Solution',
  outcome: 'Résultat',
  outcome_approved: true,
  case_study_links_approved: true,
  related_service_paths: ['/developpeur-web-valais'],
  deliverables: ['Site'],
  gallery_images: ['/gallery.webp'],
  results: [{ value: '+10%', label: 'Conversion', measurementContext: null, evidenceNote: 'Privé', approved: true }],
  seo_title: 'Titre SEO',
  seo_description: 'Description SEO',
  workflow_status: 'active',
  starts_at: '2026-06-01',
  target_at: '2026-09-01',
  budget_cents: 100000,
  internal_hourly_cost_cents: 7500,
  updated_at: `2026-09-0${index + 1}T11:00:00Z`,
  created_at: `2026-09-0${index + 1}T10:00:00Z`,
})).concat({
  id: 5,
  organization_id: 'org-other',
  title: 'Projet autre tenant',
  portfolio_visible: true,
  case_study_published: true,
} as any)

const publicProjectKeys = [
  'approach',
  'case_study_code_url',
  'case_study_live_url',
  'case_study_published',
  'case_study_published_at',
  'category',
  'challenge',
  'client_label',
  'code_url',
  'completed_at',
  'created_at',
  'deliverables',
  'description',
  'description_de',
  'description_en',
  'featured',
  'gallery_images',
  'id',
  'image',
  'key_decisions',
  'live_url',
  'outcome',
  'portfolio_visible',
  'project_duration',
  'project_role',
  'project_scope',
  'related_service_paths',
  'results',
  'seo_description',
  'seo_title',
  'slug',
  'solution',
  'tags',
  'title',
  'updated_at',
]

describe('public content APIs', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it.each([
    ['anonymous', null],
    ['client', 'client'],
  ])('returns only published articles and public properties for %s access', async (_label, role) => {
    const { query, result } = await callRoute('articles', role, articleRows)

    expect(query.select).toHaveBeenCalledWith(PUBLIC_ARTICLE_COLUMNS)
    expect(query.eq).toHaveBeenCalledWith('organization_id', 'org-public')
    expect(query.eq).toHaveBeenCalledWith('published', true)
    expect(result.map(article => article.slug)).toEqual(['publie'])
    expect(Object.keys(result[0]!).sort()).toEqual(publicArticleKeys)
    expect(result[0]).not.toHaveProperty('organization_id')
    expect(result[0]).not.toHaveProperty('internal_note')
  })

  it.each(['owner', 'admin', 'manager', 'viewer'])('preserves the complete article view for %s', async (role) => {
    const { query, result } = await callRoute('articles', role, articleRows)

    expect(query.select).toHaveBeenCalledWith('*')
    expect(query.eq).not.toHaveBeenCalledWith('published', true)
    expect(result.map(article => article.slug)).toEqual(['publie', 'brouillon'])
    expect(result[0]).toHaveProperty('organization_id', 'org-public')
    expect(result[0]).toHaveProperty('internal_note', 'secret')
  })

  it.each([
    ['anonymous', null],
    ['client', 'client'],
  ])('enforces all four project publication states for %s access', async (_label, role) => {
    const { query, result } = await callRoute('projects', role, projectRows)

    expect(query.select).toHaveBeenCalledWith(PUBLIC_PROJECT_COLUMNS)
    expect(query.eq).toHaveBeenCalledWith('organization_id', 'org-public')
    expect(query.or).toHaveBeenCalledWith('portfolio_visible.eq.true,and(case_study_published.eq.true,case_study_approved_at.not.is.null)')
    expect(result.map(project => project.id)).toEqual([2, 3, 4])
    expect(result.every(project => Object.keys(project).sort().join(',') === publicProjectKeys.join(','))).toBe(true)

    const portfolioOnly = result.find(project => project.id === 2)!
    expect(portfolioOnly).toMatchObject({ challenge: null, deliverables: [], seo_title: null })
    const publishedStudy = result.find(project => project.id === 3)!
    expect(publishedStudy).toMatchObject({ challenge: 'Détail étude', deliverables: ['Site'], seo_title: 'Titre SEO' })

    for (const project of result) {
      expect(project).not.toHaveProperty('organization_id')
      expect(project).not.toHaveProperty('client_id')
      expect(project).not.toHaveProperty('workflow_status')
      expect(project).not.toHaveProperty('budget_cents')
      expect(project).not.toHaveProperty('internal_hourly_cost_cents')
    }
  })

  it.each(['owner', 'admin', 'manager', 'viewer'])('preserves the complete project view for %s', async (role) => {
    const { query, result } = await callRoute('projects', role, projectRows)

    expect(query.select).toHaveBeenCalledWith('*')
    expect(query.or).not.toHaveBeenCalled()
    expect(result.map(project => project.id)).toEqual([1, 2, 3, 4])
    expect(result[0]).toMatchObject({
      organization_id: 'org-public',
      client_id: 900,
      workflow_status: 'active',
      budget_cents: 100000,
      internal_hourly_cost_cents: 7500,
    })
  })

  it('keeps legacy-schema portfolio cards public while every detailed case stays fail-closed', async () => {
    const primary: Record<string, any> = {}
    primary.select = vi.fn(() => primary)
    primary.eq = vi.fn(() => primary)
    primary.order = vi.fn(() => primary)
    primary.or = vi.fn(() => primary)
    primary.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({
      data: null,
      error: { code: '42703', message: 'column projects.case_study_approved_at does not exist' },
    }))
    const legacy = createQuery([projectRows[1]!])
    const from = vi.fn()
      .mockReturnValueOnce(primary)
      .mockReturnValueOnce(legacy)

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('resolveOrganizationContext', vi.fn().mockResolvedValue({ id: 'org-public', role: null }))
    vi.stubGlobal('getSupabaseAdmin', () => ({ from }))

    const { default: handler } = await import('../server/api/projects.get')
    const result = await handler({ context: {} } as never) as Row[]

    expect(legacy.select).toHaveBeenCalledWith(LEGACY_PUBLIC_PROJECT_COLUMNS)
    expect(legacy.eq).toHaveBeenCalledWith('portfolio_visible', true)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ portfolio_visible: true, case_study_published: false })
  })

  it('fails closed when no public organization can be resolved', async () => {
    const from = vi.fn()
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('resolveOrganizationContext', vi.fn().mockResolvedValue(null))
    vi.stubGlobal('getSupabaseAdmin', () => ({ from }))

    const { default: handler } = await import('../server/api/articles.get')
    await expect(handler({ context: {} } as never)).resolves.toEqual([])
    expect(from).not.toHaveBeenCalled()
  })

  it('sends the current session when the article store loads the editorial view', async () => {
    const store = await readFile('app/stores/articles.ts', 'utf8')

    expect(store).toContain("$fetch<ArticleRow[]>('/api/articles', { headers: auth.authHeader() })")
  })
})
