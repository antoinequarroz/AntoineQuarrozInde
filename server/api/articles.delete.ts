export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const { id } = getQuery(event)
  const numericId = Number(id)
  if (!numericId) throw createError({ statusCode: 400, message: 'Missing article id' })

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('organization_id', org.id)
    .eq('id', numericId)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
