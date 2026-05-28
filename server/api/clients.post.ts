export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const payload = {
    organization_id: org.id,
    name: String(body.name || '').trim(),
    company: body.company ? String(body.company).trim() : null,
    email: String(body.email || '').trim(),
    phone: body.phone ? String(body.phone).trim() : null,
    status: body.status || 'lead',
    notes: body.notes ? String(body.notes) : null,
  }

  if (!payload.name || !payload.email) {
    throw createError({ statusCode: 400, message: 'Name and email are required' })
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
