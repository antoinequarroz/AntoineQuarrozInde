export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const resource = String(getQuery(event).resource || 'clients')

  const { data, error } = await supabase
    .from('admin_saved_views')
    .select('name,payload')
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .eq('resource', resource)
    .order('updated_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return (data || []).map(item => ({
    name: item.name,
    ...(item.payload || {}),
  }))
})
