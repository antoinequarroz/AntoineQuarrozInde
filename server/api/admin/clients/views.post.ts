export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const resource = String(body.resource || 'clients')
  const name = String(body.name || '').trim()
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {}

  if (!name) {
    throw createError({ statusCode: 400, message: 'Nom de vue requis' })
  }

  const { data, error } = await supabase
    .from('admin_saved_views')
    .upsert({
      organization_id: org.id,
      user_id: user.id,
      resource,
      name,
      payload,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'organization_id,user_id,resource,name',
    })
    .select('name,payload')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  return {
    name: data.name,
    ...(data.payload || {}),
  }
})
