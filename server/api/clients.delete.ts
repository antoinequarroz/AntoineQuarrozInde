export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const { id } = getQuery(event)
  const numericId = Number(id)
  if (!numericId) throw createError({ statusCode: 400, message: 'Missing client id' })

  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('clients')
    .select('id,name,email,status')
    .eq('organization_id', org.id)
    .eq('id', numericId)
    .single()
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('organization_id', org.id)
    .eq('id', numericId)

  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'client.delete',
    entityType: 'client',
    entityId: numericId,
    clientId: numericId,
    payload: existing || { id: numericId },
  })
  return { success: true }
})
