export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event)
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })
  if (org?.id) query = query.eq('organization_id', org.id)
  const { data, error } = await query

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data ?? []
})
