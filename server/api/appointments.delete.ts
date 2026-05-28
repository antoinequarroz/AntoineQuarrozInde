export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const { id } = getQuery(event)
  const numericId = Number(id)
  if (!numericId) throw createError({ statusCode: 400, message: 'Missing appointment id' })
  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('appointments')
    .select('id,title,status,starts_at,client_id')
    .eq('organization_id', org.id)
    .eq('id', numericId)
    .single()
  const { error } = await supabase.from('appointments').delete().eq('organization_id', org.id).eq('id', numericId)
  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'appointment.delete',
    entityType: 'appointment',
    entityId: numericId,
    clientId: existing?.client_id ?? null,
    payload: existing || { id: numericId },
  })
  return { success: true }
})
