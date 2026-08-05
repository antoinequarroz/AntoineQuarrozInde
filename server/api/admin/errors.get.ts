export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const limit = Math.min(Math.max(Number(getQuery(event).limit) || 50, 1), 100)

  let query = supabase
    .from('application_errors')
    .select('id,source,severity,message,stack,path,fingerprint,metadata,created_at,resolved_at,organization_id')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  query = org.role === 'owner'
    ? query.or(`organization_id.eq.${org.id},organization_id.is.null`)
    : query.eq('organization_id', org.id)

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data || []
})
