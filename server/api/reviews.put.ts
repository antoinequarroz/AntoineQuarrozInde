export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) throw createError({ statusCode: 400, message: 'Missing review id' })

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
    .update(payload)
    .eq('organization_id', org.id)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
