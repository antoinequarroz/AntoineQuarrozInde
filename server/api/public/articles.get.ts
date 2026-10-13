import {
  PUBLIC_ARTICLE_SUMMARY_COLUMNS,
  serializePublicArticleSummary,
} from '../../utils/publicContent'
import { resolveCanonicalPublicOrganizationId } from '../../utils/publicOrganization'

const PUBLIC_ERROR_MESSAGE = 'Les articles sont temporairement indisponibles.'

export default defineEventHandler(async (event) => {
  const requestedLimit = getQuery(event).limit
  let limit: number | undefined
  if (requestedLimit !== undefined) {
    if (typeof requestedLimit !== 'string' || !/^[1-9]\d*$/.test(requestedLimit)) {
      throw createError({ statusCode: 400, statusMessage: 'Limite d’articles invalide.' })
    }
    limit = Number(requestedLimit)
    if (!Number.isSafeInteger(limit) || limit > 50) {
      throw createError({ statusCode: 400, statusMessage: 'Limite d’articles invalide.' })
    }
  }

  try {
    const organizationId = await resolveCanonicalPublicOrganizationId()
    if (!organizationId) throw new Error('Canonical public organization not found')

    let query = getSupabaseAdmin()
      .from('articles')
      .select(PUBLIC_ARTICLE_SUMMARY_COLUMNS)
      .eq('organization_id', organizationId)
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .order('slug', { ascending: true })

    if (limit !== undefined) query = query.limit(limit)
    const { data, error } = await query

    if (error) throw error
    return (data ?? []).map(serializePublicArticleSummary)
  }
  catch (error) {
    console.error('[public-articles] Listing unavailable', error)
    throw createError({
      statusCode: 503,
      statusMessage: PUBLIC_ERROR_MESSAGE,
    })
  }
})
