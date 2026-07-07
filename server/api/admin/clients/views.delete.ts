export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const resource = String(query.resource || 'clients')
  const name = String(query.name || '').trim()

  if (!name) {
    throw createError({ statusCode: 400, message: 'Nom de vue requis' })
  }

  const { error } = await supabase
    .from('admin_saved_views')
    .delete()
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .eq('resource', resource)
    .eq('name', name)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { ok: true }
})
