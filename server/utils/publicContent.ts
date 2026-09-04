const INTERNAL_CONTENT_ROLES = new Set(['owner', 'admin', 'manager', 'viewer'])

export const PUBLIC_ARTICLE_COLUMNS = [
  'id',
  'title',
  'slug',
  'excerpt',
  'content',
  'cover_image',
  'published',
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
  const caseStudyPublished = row.case_study_published === true

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
    live_url: row.live_url ?? null,
    code_url: row.code_url ?? null,
    featured: row.featured === true,
    portfolio_visible: row.portfolio_visible === true,
    case_study_published: caseStudyPublished,
    case_study_published_at: caseStudyPublished ? (row.case_study_published_at ?? null) : null,
    client_label: caseStudyPublished ? (row.client_label ?? null) : null,
    project_role: caseStudyPublished ? (row.project_role ?? null) : null,
    project_duration: caseStudyPublished ? (row.project_duration ?? null) : null,
    completed_at: caseStudyPublished ? (row.completed_at ?? null) : null,
    challenge: caseStudyPublished ? (row.challenge ?? null) : null,
    approach: caseStudyPublished ? (row.approach ?? null) : null,
    solution: caseStudyPublished ? (row.solution ?? null) : null,
    outcome: caseStudyPublished ? (row.outcome ?? null) : null,
    deliverables: caseStudyPublished && Array.isArray(row.deliverables) ? row.deliverables : [],
    gallery_images: caseStudyPublished && Array.isArray(row.gallery_images) ? row.gallery_images : [],
    results: caseStudyPublished && Array.isArray(row.results) ? row.results : [],
    seo_title: caseStudyPublished ? (row.seo_title ?? null) : null,
    seo_description: caseStudyPublished ? (row.seo_description ?? null) : null,
    updated_at: row.updated_at,
    created_at: row.created_at,
  }
}
