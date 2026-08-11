export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id || typeof body.paused !== 'boolean') throw createError({ statusCode: 400, message: 'Préférence invalide.' })
  const { data, error } = await getSupabaseAdmin().from('invoices').update({ reminders_paused: body.paused }).eq('organization_id', org.id).eq('id', id).select('id,client_id,number,reminders_paused').single()
  if (error || !data) throw createError({ statusCode: 404, message: 'Facture introuvable.' })
  await logAudit({ organizationId: org.id, actorUserId: user?.id, action: body.paused ? 'invoice.reminders_paused' : 'invoice.reminders_resumed', entityType: 'invoice', entityId: id, clientId: data.client_id, payload: { number: data.number } })
  return data
})
