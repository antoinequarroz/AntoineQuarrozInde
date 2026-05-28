export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const { id } = getQuery(event)
  const numericId = Number(id)
  if (!numericId) throw createError({ statusCode: 400, message: 'Missing task id' })

  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('tasks')
    .select('id,title,status,priority,client_id')
    .eq('organization_id', org.id)
    .eq('id', numericId)
    .single()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('organization_id', org.id)
    .eq('id', numericId)

  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'task.delete',
    entityType: 'task',
    entityId: numericId,
    clientId: existing?.client_id ?? null,
    payload: existing || { id: numericId },
  })
  return { success: true }
})
