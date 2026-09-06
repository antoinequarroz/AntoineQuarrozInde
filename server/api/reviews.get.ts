const REVIEW_FIELDS = 'id,author,company,role,avatar,rating,content,visible,created_at'

export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event)
  if (!org?.id) return []
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('reviews')
    .select(REVIEW_FIELDS)
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  const canReadHiddenReviews = ['owner', 'admin', 'manager'].includes(String(org.role || ''))
  if (canReadHiddenReviews) await requireAdminMfa(event, event.context.user)
  if (!canReadHiddenReviews) query = query.eq('visible', true)
  const { data, error } = await query

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data ?? []
})
