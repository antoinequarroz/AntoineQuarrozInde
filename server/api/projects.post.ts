export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const payload = {
    organization_id: org.id,
    title: body.title,
    slug: body.slug,
    category: body.category,
    tags: body.tags ?? [],
    description: body.description,
    image: body.image ?? null,
    live_url: body.liveUrl ?? null,
    code_url: body.codeUrl ?? null,
    featured: Boolean(body.featured),
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
