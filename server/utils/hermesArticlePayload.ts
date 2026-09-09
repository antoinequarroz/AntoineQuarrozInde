import { MAX_IMAGE_REQUEST_BYTES } from './imageUpload'

export const MAX_HERMES_ARTICLE_REQUEST_BYTES = MAX_IMAGE_REQUEST_BYTES + 512 * 1024
export const HERMES_PUBLICATION_SITE = 'https://www.antoinequarroz.ch'

const ALLOWED_FIELDS = new Set([
  'site',
  'title',
  'slug',
  'excerpt',
  'content',
  'tags',
  'readTime',
  'published',
  'coverImageDataUrl',
  'sourceUrls',
])

function requiredString(body: Record<string, unknown>, field: string, min: number, max: number) {
  const value = body[field]
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, message: `${field} must be a string` })
  }
  const normalized = value.trim()
  if (normalized.length < min || normalized.length > max) {
    throw createError({ statusCode: 400, message: `${field} has an invalid length` })
  }
  return normalized
}

export function validateHermesIdempotencyKey(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(value)) {
    throw createError({ statusCode: 400, message: 'Invalid Idempotency-Key' })
  }
  return value
}

export function validateHermesArticlePayload(body: Record<string, unknown>) {
  const unknownFields = Object.keys(body).filter(field => !ALLOWED_FIELDS.has(field))
  if (unknownFields.length) {
    throw createError({ statusCode: 400, message: 'Unknown article fields are not accepted' })
  }
  if (body.site !== HERMES_PUBLICATION_SITE) {
    throw createError({ statusCode: 400, message: 'Publication site is not allowed' })
  }
  if (body.published !== true) {
    throw createError({ statusCode: 400, message: 'Hermes articles must be explicitly published' })
  }

  const title = requiredString(body, 'title', 10, 160)
  const slug = requiredString(body, 'slug', 10, 160)
  const excerpt = requiredString(body, 'excerpt', 40, 320)
  const content = requiredString(body, 'content', 800, 100_000)
  const coverImageDataUrl = requiredString(body, 'coverImageDataUrl', 32, MAX_IMAGE_REQUEST_BYTES)

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 400, message: 'slug must contain lowercase ASCII words separated by hyphens' })
  }

  if (!Array.isArray(body.tags) || body.tags.length < 1 || body.tags.length > 8
    || body.tags.some(tag => typeof tag !== 'string' || tag.trim().length < 2 || tag.trim().length > 40)) {
    throw createError({ statusCode: 400, message: 'tags must contain between 1 and 8 short labels' })
  }

  const readTime = Number(body.readTime)
  if (!Number.isInteger(readTime) || readTime < 1 || readTime > 60) {
    throw createError({ statusCode: 400, message: 'readTime must be an integer between 1 and 60' })
  }

  if (!Array.isArray(body.sourceUrls) || body.sourceUrls.length < 2 || body.sourceUrls.length > 12) {
    throw createError({ statusCode: 400, message: 'sourceUrls must contain between 2 and 12 HTTPS URLs' })
  }
  const sourceUrls = [...new Set(body.sourceUrls.map((source) => {
    if (typeof source !== 'string') {
      throw createError({ statusCode: 400, message: 'sourceUrls must contain HTTPS URLs' })
    }
    try {
      const url = new URL(source)
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('invalid')
      return url.toString()
    }
    catch {
      throw createError({ statusCode: 400, message: 'sourceUrls must contain HTTPS URLs' })
    }
  }))]
  if (sourceUrls.length < 2) {
    throw createError({ statusCode: 400, message: 'At least two distinct source URLs are required' })
  }

  return {
    title,
    slug,
    excerpt,
    content,
    coverImageDataUrl,
    tags: body.tags.map(tag => String(tag).trim()),
    readTime,
    sourceUrls,
  }
}
