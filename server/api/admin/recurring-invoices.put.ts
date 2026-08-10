export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id || typeof body.active !== 'boolean') throw createError({ statusCode: 400, message: 'Modification invalide.' })
  const { data, error } = await getSupabaseAdmin().from('recurring_invoice_profiles').update({ active: body.active, updated_at: new Date().toISOString() }).eq('organization_id', org.id).eq('id', id).select('*').single()
  if (error || !data) throw createError({ statusCode: 404, message: 'Récurrence introuvable.' })
  await logAudit({ organizationId: org.id, actorUserId: user?.id, action: body.active ? 'recurring_invoice.resumed' : 'recurring_invoice.paused', entityType: 'recurring_invoice_profile', entityId: id, clientId: data.client_id })
  return data
})
