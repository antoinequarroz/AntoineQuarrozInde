const INTERNAL_CONTENT_ROLES = new Set(['owner', 'admin', 'manager', 'viewer'])

export const PUBLIC_ARTICLE_COLUMNS = [
  'id',
  'title',
  'slug',
  'excerpt',
  'content',
  'cover_image',
  'published',
  'author_key',
  'published_at',
  'updated_at',
  'tags',
  'created_at',
  'read_time',
].join(',')

export const PUBLIC_ARTICLE_SUMMARY_COLUMNS = [
  'title',
  'slug',
  'excerpt',
  'cover_image',
  'published_at',
  'tags',
  'created_at',
  'read_time',
].join(',')

export const PUBLIC_PROJECT_COLUMNS = [
  'id',
  'title',
  'slug',
  'category',
  'tags',
  'description',
  'description_en',
  'description_de',
  'image',
  'live_url',
  'code_url',
  'featured',
  'portfolio_visible',
  'case_study_published',
  'case_study_published_at',
  'case_study_approved_at',
  'client_label',
  'client_disclosure_status',
  'project_role',
  'project_duration',
  'case_study_timeline_approved',
  'completed_at',
  'challenge',
  'project_scope',
  'key_decisions',
  'approach',
  'solution',
  'outcome',
  'outcome_approved',
  'case_study_links_approved',
  'related_service_paths',
  'deliverables',
  'gallery_images',
  'results',
  'seo_title',
  'seo_description',
  'updated_at',
  'created_at',
].join(',')

export const LEGACY_PUBLIC_PROJECT_COLUMNS = [
  'id',
  'title',
  'slug',
  'category',
  'tags',
  'description',
  'description_en',
  'description_de',
  'image',
  'live_url',
  'code_url',
  'featured',
  'portfolio_visible',
  'case_study_published',
  'case_study_published_at',
  'client_label',
  'project_role',
  'project_duration',
  'completed_at',
  'challenge',
  'approach',
  'solution',
  'outcome',
  'deliverables',
  'gallery_images',
  'results',
  'seo_title',
  'seo_description',
  'updated_at',
  'created_at',
].join(',')

const APPROVAL_SCHEMA_FIELDS = [
  'case_study_approved_at',
  'client_disclosure_status',
  'project_scope',
  'key_decisions',
  'related_service_paths',
]

export function isMissingCaseStudyApprovalSchema(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const record = error as { code?: unknown, message?: unknown }
  const code = String(record.code ?? '')
  const message = String(record.message ?? '')
  return ['42703', 'PGRST204'].includes(code)
    && APPROVAL_SCHEMA_FIELDS.some(field => message.includes(field))
}

type PublicArticleRow = Record<string, any>
type PublicProjectRow = Record<string, any>

export function isPublicContentRole(role: string | null | undefined) {
  return !role || !INTERNAL_CONTENT_ROLES.has(role)
}

export function serializePublicArticle(row: PublicArticleRow) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    cover_image: row.cover_image ?? null,
    published: row.published,
    author_key: row.author_key,
    published_at: row.published_at ?? null,
    updated_at: row.updated_at,
    tags: Array.isArray(row.tags) ? row.tags : [],
    created_at: row.created_at,
    read_time: row.read_time,
  }
}

export function serializePublicArticleSummary(row: PublicArticleRow) {
  return {
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    cover_image: row.cover_image ?? null,
    published_at: row.published_at ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    created_at: row.created_at,
    read_time: row.read_time,
  }
}

export function serializePublicProject(row: PublicProjectRow) {
  const portfolioVisible = row.portfolio_visible === true
  const caseStudyPublished = row.case_study_published === true && Boolean(row.case_study_approved_at)
  const linksApproved = caseStudyPublished && row.case_study_links_approved === true
  const timelineApproved = caseStudyPublished && row.case_study_timeline_approved === true
  const clientApproved = caseStudyPublished && row.client_disclosure_status === 'approved'
  const approvedResults = caseStudyPublished && Array.isArray(row.results)
    ? row.results.flatMap((result: Record<string, unknown>) => (
        result?.approved === true && result.value && result.label
          ? [{
              value: String(result.value),
              label: String(result.label),
              measurementContext: result.measurementContext ? String(result.measurementContext) : null,
            }]
          : []
      ))
    : []

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    description: row.description,
    description_en: row.description_en ?? null,
    description_de: row.description_de ?? null,
    image: row.image ?? null,
    live_url: portfolioVisible || linksApproved ? (row.live_url ?? null) : null,
    code_url: portfolioVisible || linksApproved ? (row.code_url ?? null) : null,
    featured: row.featured === true,
    portfolio_visible: portfolioVisible,
    case_study_published: caseStudyPublished,
    case_study_live_url: linksApproved ? (row.live_url ?? null) : null,
    case_study_code_url: linksApproved ? (row.code_url ?? null) : null,
    case_study_published_at: caseStudyPublished ? (row.case_study_published_at ?? null) : null,
    client_label: clientApproved ? (row.client_label ?? null) : null,
    project_role: caseStudyPublished ? (row.project_role ?? null) : null,
    project_duration: timelineApproved ? (row.project_duration ?? null) : null,
    completed_at: timelineApproved ? (row.completed_at ?? null) : null,
    challenge: caseStudyPublished ? (row.challenge ?? null) : null,
    project_scope: caseStudyPublished ? (row.project_scope ?? null) : null,
    key_decisions: caseStudyPublished ? (row.key_decisions ?? null) : null,
    approach: caseStudyPublished ? (row.approach ?? null) : null,
    solution: caseStudyPublished ? (row.solution ?? null) : null,
    outcome: caseStudyPublished && row.outcome_approved === true ? (row.outcome ?? null) : null,
    related_service_paths: caseStudyPublished && Array.isArray(row.related_service_paths) ? row.related_service_paths : [],
    deliverables: caseStudyPublished && Array.isArray(row.deliverables) ? row.deliverables : [],
    gallery_images: caseStudyPublished && Array.isArray(row.gallery_images) ? row.gallery_images : [],
    results: approvedResults,
    seo_title: caseStudyPublished ? (row.seo_title ?? null) : null,
    seo_description: caseStudyPublished ? (row.seo_description ?? null) : null,
    updated_at: row.updated_at,
    created_at: row.created_at,
  }
}
