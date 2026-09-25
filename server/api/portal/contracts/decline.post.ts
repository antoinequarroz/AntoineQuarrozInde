export default defineEventHandler(async (event) => {
  const { org, user, client } = await requirePortalClient(event)
  const body = await readBody<Record<string, any>>(event)
  const contractId = Number(body.contractId)
  const reason = String(body.reason || '').trim().slice(0, 2000)
  if (!Number.isInteger(contractId) || contractId <= 0 || body.confirmed !== true) throw createError({ statusCode: 400, message: 'Confirmez votre décision.' })
  const supabase = getSupabaseAdmin()
  const { data: contract } = await supabase.from('contracts').select('id,number,title,status').eq('organization_id', org.id).eq('client_id', client.id).eq('id', contractId).maybeSingle()
  if (!contract) throw createError({ statusCode: 404, message: 'Contrat introuvable.' })
  if (contract.status === 'declined') return { declined: true, duplicate: true }
  if (contract.status !== 'sent') throw createError({ statusCode: 409, message: 'Ce contrat ne peut plus être refusé.' })
  const declinedAt = new Date().toISOString()
  const { data: updated, error } = await supabase.from('contracts').update({ status: 'declined', declined_at: declinedAt, updated_at: declinedAt })
    .eq('organization_id', org.id).eq('client_id', client.id).eq('id', contractId).eq('status', 'sent').select('id').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!updated) throw createError({ statusCode: 409, message: 'Le contrat a changé. Rechargez la page.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: 'contract.portal_declined', entityType: 'contract', entityId: contractId, clientId: client.id, payload: { number: contract.number, declined_at: declinedAt, reason } })
  await notifyOperationalEvent({
    organizationId: org.id,
    subject: `Contrat ${contract.number} à revoir`, title: 'Un client demande une modification du contrat',
    body: `<p><strong>${escapeEmailHtml(client.name)}</strong> n’a pas accepté le contrat <strong>${escapeEmailHtml(contract.number)}</strong>.</p>${reason ? `<p>Motif : ${escapeEmailHtml(reason)}</p>` : ''}`,
    action: 'contract.portal_declined', entityType: 'contract', entityId: contractId, clientId: client.id,
    idempotencyKey: `contract-declined-${contractId}-${declinedAt}`,
  })
  return { declined: true, declinedAt }
})
