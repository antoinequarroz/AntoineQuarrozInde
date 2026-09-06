import {
  isPublicContentRole,
  PUBLIC_ARTICLE_COLUMNS,
  serializePublicArticle,
} from '../utils/publicContent'

export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event)
  if (!org?.id) return []

  const supabase = getSupabaseAdmin()
  const publicView = isPublicContentRole(org.role)
  if (!publicView) await requireAdminMfa(event, event.context.user)
  let query = supabase
    .from('articles')
    .select(publicView ? PUBLIC_ARTICLE_COLUMNS : '*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
  if (publicView) query = query.eq('published', true)
  const { data, error } = await query

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  if (!publicView) return data ?? []

  return (data ?? []).map(serializePublicArticle)
})
