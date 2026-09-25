export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const id = Number(getQuery(event).id)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Contrat invalide.' })
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('contracts').delete().eq('organization_id', org.id).eq('id', id).eq('status', 'draft').select('id,client_id,number').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) throw createError({ statusCode: 409, message: 'Seul un brouillon peut être supprimé.' })
  await logAudit({ organizationId: org.id, actorUserId: user?.id, action: 'contract.delete', entityType: 'contract', entityId: id, clientId: data.client_id, payload: { number: data.number } })
  return { success: true }
})
