export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event)
  if (!org?.id) return []
  const supabase = getSupabaseAdmin()
  const query = supabase
    .from('reviews')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
  const { data, error } = await query

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data ?? []
})
