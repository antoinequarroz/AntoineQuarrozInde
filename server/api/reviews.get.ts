export default defineEventHandler(async () => {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data ?? []
})
