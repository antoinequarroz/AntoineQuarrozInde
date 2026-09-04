import {
  PUBLIC_ARTICLE_SUMMARY_COLUMNS,
  serializePublicArticleSummary,
} from '../../utils/publicContent'
import { resolveCanonicalPublicOrganizationId } from '../../utils/publicOrganization'

const PUBLIC_ERROR_MESSAGE = 'Les articles sont temporairement indisponibles.'

export default defineEventHandler(async () => {
  try {
    const organizationId = await resolveCanonicalPublicOrganizationId()
    if (!organizationId) throw new Error('Canonical public organization not found')

    const { data, error } = await getSupabaseAdmin()
      .from('articles')
      .select(PUBLIC_ARTICLE_SUMMARY_COLUMNS)
      .eq('organization_id', organizationId)
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .order('slug', { ascending: true })

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
