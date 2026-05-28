export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const payload = {
    organization_id: org.id,
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt,
    content: body.content,
    cover_image: body.coverImage ?? null,
    published: Boolean(body.published),
    tags: body.tags ?? [],
    read_time: Number(body.readTime ?? 5),
  }

  const { data, error } = await supabase
    .from('articles')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
