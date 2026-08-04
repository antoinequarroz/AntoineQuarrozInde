export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event)
  const supabase = getSupabaseAdmin()
  const columns = org?.role
    ? '*'
    : 'id,organization_id,title,slug,category,tags,description,image,live_url,code_url,featured,created_at'
  let query = supabase
    .from('projects')
    .select(columns)
    .order('created_at', { ascending: false })
  if (org?.id) query = query.eq('organization_id', org.id)
  const { data, error } = await query

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data ?? []
})
