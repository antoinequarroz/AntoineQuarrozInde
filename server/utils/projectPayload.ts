import {
  isProjectCaseStudyServicePath,
  type ProjectClientDisclosureStatus,
} from '../../shared/utils/projectCaseStudyApproval'
import {
  PROJECT_CASE_STUDY_LOCALES,
  PROJECT_CASE_STUDY_LOCALE_LABELS,
  type ProjectCaseStudyLocale,
} from '../../shared/utils/projectCaseStudyLocalizations'

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

function localizedError(locale: ProjectCaseStudyLocale, field: string, message: string): never {
  throw createError({
    statusCode: 400,
    message: `${PROJECT_CASE_STUDY_LOCALE_LABELS[locale]} — ${message}`,
    data: { locale, field },
  })
}

function localizedOptionalText(
  value: unknown,
  locale: ProjectCaseStudyLocale,
  field: string,
  label: string,
  maxLength: number,
) {
  const text = String(value ?? '').trim()
  if (!text) return null
  if (text.length > maxLength) localizedError(locale, field, `${label} dépasse ${maxLength} caractères`)
  return text
}

function localizedDeliverables(value: unknown, locale: ProjectCaseStudyLocale) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) localizedError(locale, 'deliverables', 'les livrables doivent être une liste')
  if (value.length > 20) localizedError(locale, 'deliverables', 'les livrables sont limités à 20 éléments')
  return value.map((item, index) => {
    const text = String(item ?? '').trim()
    if (!text) localizedError(locale, 'deliverables', `le livrable ${index + 1} est vide`)
    if (text.length > 120) localizedError(locale, 'deliverables', `le livrable ${index + 1} dépasse 120 caractères`)
    return text
  })
}

function localizedResults(value: unknown, locale: ProjectCaseStudyLocale) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) localizedError(locale, 'results', 'les résultats doivent être une liste')
  if (value.length > 6) localizedError(locale, 'results', 'les résultats sont limités à 6 mesures')
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') localizedError(locale, 'results', `la mesure ${index + 1} est invalide`)
    const record = item as Record<string, unknown>
    const valueText = String(record.value ?? '').trim()
    const label = String(record.label ?? '').trim()
    if (!valueText) localizedError(locale, `results.${index}.value`, `la valeur de la mesure ${index + 1} est obligatoire`)
    if (valueText.length > 40) localizedError(locale, `results.${index}.value`, `la valeur de la mesure ${index + 1} dépasse 40 caractères`)
    if (!label) localizedError(locale, `results.${index}.label`, `le libellé de la mesure ${index + 1} est obligatoire`)
    if (label.length > 120) localizedError(locale, `results.${index}.label`, `le libellé de la mesure ${index + 1} dépasse 120 caractères`)
    if (record.approved !== undefined && typeof record.approved !== 'boolean') {
      localizedError(locale, `results.${index}.approved`, `l'approbation de la mesure ${index + 1} est invalide`)
    }
    return {
      value: valueText,
      label,
      measurementContext: localizedOptionalText(record.measurementContext, locale, `results.${index}.measurementContext`, `le contexte de la mesure ${index + 1}`, 240),
      evidenceNote: localizedOptionalText(record.evidenceNote, locale, `results.${index}.evidenceNote`, `la note de preuve de la mesure ${index + 1}`, 1000),
      approved: record.approved === true,
    }
  })
}

function projectCaseStudyLocalizations(value: unknown) {
  if (value === undefined) return null
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createError({ statusCode: 400, message: 'Case-study localizations must be an object' })
  }
  const record = value as Record<string, unknown>
  const unknownLocale = Object.keys(record).find(locale => !PROJECT_CASE_STUDY_LOCALES.includes(locale as ProjectCaseStudyLocale))
  if (unknownLocale) throw createError({ statusCode: 400, message: `Unsupported case-study locale: ${unknownLocale}` })

  return Object.fromEntries(PROJECT_CASE_STUDY_LOCALES.map((locale) => {
    const raw = record[locale]
    if (raw !== undefined && (!raw || typeof raw !== 'object' || Array.isArray(raw))) {
      localizedError(locale, 'localization', 'le contenu de cette langue est invalide')
    }
    const input = (raw ?? {}) as Record<string, unknown>
    return [locale, {
      project_role: localizedOptionalText(input.projectRole, locale, 'projectRole', 'le rôle', 180),
      project_duration: localizedOptionalText(input.projectDuration, locale, 'projectDuration', 'la durée', 120),
      challenge: localizedOptionalText(input.challenge, locale, 'challenge', 'le contexte', 4000),
      project_scope: localizedOptionalText(input.projectScope, locale, 'projectScope', 'le périmètre', 6000),
      key_decisions: localizedOptionalText(input.keyDecisions, locale, 'keyDecisions', 'les décisions', 6000),
      approach: localizedOptionalText(input.approach, locale, 'approach', `l'approche`, 6000),
      solution: localizedOptionalText(input.solution, locale, 'solution', 'la solution', 6000),
      outcome: localizedOptionalText(input.outcome, locale, 'outcome', 'le résultat qualitatif', 4000),
      deliverables: localizedDeliverables(input.deliverables, locale),
      results: localizedResults(input.results, locale),
    }]
  }))
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
  const liveUrl = optionalUrl(body.liveUrl)
  const codeUrl = optionalUrl(body.codeUrl)
  const localizations = projectCaseStudyLocalizations(body.caseStudyLocalizations)

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 400, message: 'Project slug must contain lowercase letters, numbers and hyphens only' })
  }
  if (completedAt && !/^\d{4}-\d{2}-\d{2}$/.test(completedAt)) {
    throw createError({ statusCode: 400, message: 'Invalid project completion date' })
  }
  if (clientId !== null && (!Number.isInteger(clientId) || clientId <= 0)) {
    throw createError({ statusCode: 400, message: 'Invalid project client' })
  }
  if ((portfolioVisible || caseStudyPublished) && !liveUrl && !codeUrl) {
    throw createError({ statusCode: 400, message: 'A public project requires a website or GitHub URL' })
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
    live_url: liveUrl,
    code_url: codeUrl,
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
    ...(localizations ? { case_study_localizations: localizations } : {}),
  }
}
