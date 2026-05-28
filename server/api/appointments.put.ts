export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) throw createError({ statusCode: 400, message: 'Missing appointment id' })
  const supabase = getSupabaseAdmin()
  const payload = {
    client_id: body.clientId ? Number(body.clientId) : null,
    title: String(body.title || '').trim(),
    description: body.description || null,
    starts_at: body.startsAt,
    ends_at: body.endsAt,
    location: body.location || null,
    meeting_url: body.meetingUrl || null,
    status: body.status || 'scheduled',
  }
  const { data, error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('organization_id', org.id)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'appointment.update',
    entityType: 'appointment',
    entityId: data.id,
    clientId: data.client_id,
    payload: { title: data.title, status: data.status, starts_at: data.starts_at },
  })
  return data
})
