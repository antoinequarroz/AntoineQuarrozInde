export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data ?? []
})
