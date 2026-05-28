export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const { clientId, limit } = getQuery(event)
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .limit(Number(limit) || 50)

  if (clientId) query = query.eq('client_id', Number(clientId))

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data || []
})
