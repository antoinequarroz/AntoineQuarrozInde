export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) throw createError({ statusCode: 400, message: 'Missing project id' })

  const supabase = getSupabaseAdmin()
  const { organization_id: _organizationId, ...payload } = projectPayload(body, org.id)

  const { data, error } = await supabase
    .from('projects')
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
