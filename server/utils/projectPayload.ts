import {
  isProjectCaseStudyServicePath,
  type ProjectClientDisclosureStatus,
} from '../../shared/utils/projectCaseStudyApproval'

const PROJECT_CATEGORIES = new Set(['web', 'mobile', 'cms'])
const CLIENT_DISCLOSURE_STATUSES = new Set<ProjectClientDisclosureStatus>(['pending', 'anonymous', 'approved'])

function requiredText(value: unknown, field: string, maxLength: number) {
  const text = String(value ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: `${field} is required` })
  if (text.length > maxLength) throw createError({ statusCode: 400, message: `${field} is too long` })
  return text
}

function optionalText(value: unknown, maxLength: number) {
  const text = String(value ?? '').trim()
  if (!text) return null
  if (text.length > maxLength) throw createError({ statusCode: 400, message: 'A project field is too long' })
  return text
}

function textArray(value: unknown, maxItems: number, maxLength = 120) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map(item => item.slice(0, maxLength))
}

function optionalUrl(value: unknown) {
  const text = optionalText(value, 2000)
  if (!text) return null
  try {
    const url = new URL(text)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol')
    return url.toString()
  }
  catch {
    throw createError({ statusCode: 400, message: 'Invalid project URL' })
  }
}

function requiredUrl(value: unknown, field: string) {
  const url = optionalUrl(value)
  if (!url) throw createError({ statusCode: 400, message: `${field} is required` })
  return url
}

function booleanValue(value: unknown, field: string) {
  if (value === undefined || value === null) return false
  if (typeof value !== 'boolean') {
    throw createError({ statusCode: 400, message: `${field} must be a boolean` })
  }
  return value
}

function resultList(value: unknown) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw createError({ statusCode: 400, message: 'results must be an array' })
  if (value.length > 6) throw createError({ statusCode: 400, message: 'A project can contain at most 6 results' })
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw createError({ statusCode: 400, message: `result ${index + 1} is invalid` })
    }
    const record = item as Record<string, unknown>
    return {
      value: requiredText(record.value, `result ${index + 1} value`, 40),
      label: requiredText(record.label, `result ${index + 1} label`, 120),
      measurementContext: optionalText(record.measurementContext, 240),
      evidenceNote: optionalText(record.evidenceNote, 1000),
      approved: booleanValue(record.approved, `result ${index + 1} approved`),
    }
  })
}

function clientDisclosureStatus(value: unknown): ProjectClientDisclosureStatus {
  const status = String(value ?? 'pending') as ProjectClientDisclosureStatus
  if (!CLIENT_DISCLOSURE_STATUSES.has(status)) {
    throw createError({ statusCode: 400, message: 'Invalid client disclosure status' })
  }
  return status
}

function relatedServicePaths(value: unknown) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw createError({ statusCode: 400, message: 'relatedServicePaths must be an array' })
  const paths = value.map(item => String(item ?? '').trim())
  if (new Set(paths).size !== paths.length || paths.some(path => !isProjectCaseStudyServicePath(path))) {
    throw createError({ statusCode: 400, message: 'Invalid related case-study service' })
  }
  return paths
}

export function projectPayload(body: Record<string, unknown>, organizationId: string) {
  const category = String(body.category ?? '')
  if (!PROJECT_CATEGORIES.has(category)) {
    throw createError({ statusCode: 400, message: 'Invalid project category' })
  }

  const portfolioVisible = booleanValue(body.portfolioVisible, 'portfolioVisible')
  const caseStudyPublished = booleanValue(body.caseStudyPublished, 'caseStudyPublished')
  const slug = requiredText(body.slug, 'slug', 180)
  const completedAt = optionalText(body.completedAt, 10)
  const clientId = body.clientId ? Number(body.clientId) : null

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 400, message: 'Project slug must contain lowercase letters, numbers and hyphens only' })
  }
  if (completedAt && !/^\d{4}-\d{2}-\d{2}$/.test(completedAt)) {
    throw createError({ statusCode: 400, message: 'Invalid project completion date' })
  }
  if (clientId !== null && (!Number.isInteger(clientId) || clientId <= 0)) {
    throw createError({ statusCode: 400, message: 'Invalid project client' })
  }

  return {
    organization_id: organizationId,
    client_id: clientId,
    title: requiredText(body.title, 'title', 180),
    slug,
    category,
    tags: textArray(body.tags, 20),
    description: requiredText(body.description, 'description', 1200),
    description_en: optionalText(body.descriptionEn, 1200),
    description_de: optionalText(body.descriptionDe, 1200),
    image: requiredText(body.image, 'image', 2000),
    live_url: requiredUrl(body.liveUrl, 'liveUrl'),
    code_url: optionalUrl(body.codeUrl),
    featured: Boolean(body.featured),
    portfolio_visible: portfolioVisible,
    case_study_published: caseStudyPublished,
    client_label: optionalText(body.clientLabel, 180),
    client_disclosure_status: clientDisclosureStatus(body.clientDisclosureStatus),
    project_role: optionalText(body.projectRole, 180),
    project_duration: optionalText(body.projectDuration, 120),
    case_study_timeline_approved: booleanValue(body.caseStudyTimelineApproved, 'caseStudyTimelineApproved'),
    completed_at: completedAt,
    challenge: optionalText(body.challenge, 4000),
    project_scope: optionalText(body.projectScope, 6000),
    key_decisions: optionalText(body.keyDecisions, 6000),
    approach: optionalText(body.approach, 6000),
    solution: optionalText(body.solution, 6000),
    outcome: optionalText(body.outcome, 4000),
    outcome_approved: booleanValue(body.outcomeApproved, 'outcomeApproved'),
    case_study_links_approved: booleanValue(body.caseStudyLinksApproved, 'caseStudyLinksApproved'),
    related_service_paths: relatedServicePaths(body.relatedServicePaths),
    deliverables: textArray(body.deliverables, 20),
    gallery_images: textArray(body.galleryImages, 12, 2000)
      .map(optionalUrl)
      .filter((url): url is string => Boolean(url)),
    results: resultList(body.results),
    seo_title: optionalText(body.seoTitle, 70),
    seo_description: optionalText(body.seoDescription, 180),
    case_study_approval_confirmed: booleanValue(body.caseStudyApprovalConfirmed, 'caseStudyApprovalConfirmed'),
  }
}
