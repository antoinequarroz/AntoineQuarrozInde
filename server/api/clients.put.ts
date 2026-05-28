export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) throw createError({ statusCode: 400, message: 'Missing client id' })

  const supabase = getSupabaseAdmin()
  const payload = {
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
    .update(payload)
    .eq('organization_id', org.id)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'client.update',
    entityType: 'client',
    entityId: data.id,
    clientId: data.id,
    payload: { name: data.name, email: data.email, status: data.status },
  })
  return data
})
