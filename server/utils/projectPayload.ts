const PROJECT_CATEGORIES = new Set(['web', 'mobile', 'cms'])

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

function resultList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 6).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const resultValue = optionalText(record.value, 40)
    const label = optionalText(record.label, 120)
    return resultValue && label ? [{ value: resultValue, label }] : []
  })
}

export function projectPayload(body: Record<string, unknown>, organizationId: string) {
  const category = String(body.category ?? '')
  if (!PROJECT_CATEGORIES.has(category)) {
    throw createError({ statusCode: 400, message: 'Invalid project category' })
  }

  const challenge = optionalText(body.challenge, 4000)
  const solution = optionalText(body.solution, 6000)
  const outcome = optionalText(body.outcome, 4000)
  const results = resultList(body.results)
  const caseStudyPublished = Boolean(body.caseStudyPublished)
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

  if (caseStudyPublished && (!challenge || !solution || (!outcome && !results.length))) {
    throw createError({
      statusCode: 400,
      message: 'A published case study needs a challenge, a solution and an outcome or verified result',
    })
  }

  return {
    organization_id: organizationId,
    client_id: clientId,
    title: requiredText(body.title, 'title', 180),
    slug,
    category,
    tags: textArray(body.tags, 20),
    description: requiredText(body.description, 'description', 1200),
    image: optionalText(body.image, 2000),
    live_url: optionalUrl(body.liveUrl),
    code_url: optionalUrl(body.codeUrl),
    featured: Boolean(body.featured),
    case_study_published: caseStudyPublished,
    client_label: optionalText(body.clientLabel, 180),
    project_role: optionalText(body.projectRole, 180),
    project_duration: optionalText(body.projectDuration, 120),
    completed_at: completedAt,
    challenge,
    approach: optionalText(body.approach, 6000),
    solution,
    outcome,
    deliverables: textArray(body.deliverables, 20),
    gallery_images: textArray(body.galleryImages, 12, 2000)
      .map(optionalUrl)
      .filter((url): url is string => Boolean(url)),
    results,
    seo_title: optionalText(body.seoTitle, 70),
    seo_description: optionalText(body.seoDescription, 180),
  }
}
