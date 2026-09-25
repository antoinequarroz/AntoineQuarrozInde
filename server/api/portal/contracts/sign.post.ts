export default defineEventHandler(async (event) => {
  const { org, user, client } = await requirePortalClient(event)
  const body = await readBody<Record<string, any>>(event)
  const contractId = Number(body.contractId)
  const signerName = String(body.signerName || '').trim().slice(0, 240)
  if (!Number.isInteger(contractId) || contractId <= 0 || body.confirmed !== true || signerName.length < 3) {
    throw createError({ statusCode: 400, message: 'Confirmez la lecture et saisissez votre nom complet.' })
  }
  const supabase = getSupabaseAdmin()
  const { data: contract, error } = await supabase.from('contracts').select('id,number,title,status,snapshot_hash')
    .eq('organization_id', org.id).eq('client_id', client.id).eq('id', contractId).maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!contract) throw createError({ statusCode: 404, message: 'Contrat introuvable.' })
  if (contract.status === 'signed') return { signed: true, duplicate: true }
  if (contract.status !== 'sent') throw createError({ statusCode: 409, message: 'Ce contrat ne peut plus être accepté.' })
  const signedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase.from('contracts').update({
    status: 'signed',
    signed_at: signedAt,
    signed_by_user_id: user.id,
    signer_name: signerName,
    signer_email: user.email,
    acceptance_ip: getRequestIP(event, { xForwardedFor: true }) || null,
    acceptance_user_agent: String(getHeader(event, 'user-agent') || '').slice(0, 1000) || null,
    updated_at: signedAt,
  }).eq('organization_id', org.id).eq('client_id', client.id).eq('id', contractId).eq('status', 'sent').select('id,status,signed_at').maybeSingle()
  if (updateError) throw createError({ statusCode: 500, message: updateError.message })
  if (!updated) throw createError({ statusCode: 409, message: 'Le contrat a changé. Rechargez la page.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: 'contract.portal_signed', entityType: 'contract', entityId: contractId, clientId: client.id, payload: { number: contract.number, signed_at: signedAt, snapshot_hash: contract.snapshot_hash, signer_name: signerName } })
  await notifyOperationalEvent({
    organizationId: org.id,
    subject: `Contrat ${contract.number} accepté par ${client.name}`,
    title: 'Un contrat vient d’être accepté',
    body: `<p><strong>${escapeEmailHtml(client.name)}</strong> a accepté le contrat <strong>${escapeEmailHtml(contract.number)}</strong>.</p>`,
    action: 'contract.portal_signed', entityType: 'contract', entityId: contractId, clientId: client.id,
    idempotencyKey: `contract-signed-${contractId}-${signedAt}`,
  })
  return { signed: true, signedAt }
})
