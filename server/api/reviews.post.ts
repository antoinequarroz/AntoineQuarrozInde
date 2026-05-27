export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const payload = {
    author: body.author,
    company: body.company ?? '',
    role: body.role ?? '',
    avatar: body.avatar ?? null,
    rating: Number(body.rating ?? 5),
    content: body.content,
    visible: body.visible !== false,
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
