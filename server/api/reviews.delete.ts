export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = getQuery(event)
  const numericId = Number(id)
  if (!numericId) throw createError({ statusCode: 400, message: 'Missing review id' })

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', numericId)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
