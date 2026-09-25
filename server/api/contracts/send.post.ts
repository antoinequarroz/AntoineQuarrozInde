import { contractSnapshot, hashContractSnapshot } from '../../utils/clientContract'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const id = Number((await readBody<Record<string, any>>(event))?.id)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Contrat invalide.' })
  const supabase = getSupabaseAdmin()
  const { data: contract } = await supabase.from('contracts').select('*').eq('organization_id', org.id).eq('id', id).maybeSingle()
  if (!contract) throw createError({ statusCode: 404, message: 'Contrat introuvable.' })
  if (!['draft', 'sent'].includes(contract.status)) throw createError({ statusCode: 409, message: 'Ce contrat ne peut plus être envoyé.' })
  const [{ data: organization }, { data: client }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', org.id).single(),
    supabase.from('clients').select('*').eq('organization_id', org.id).eq('id', contract.client_id).single(),
  ])
  if (!client?.email) throw createError({ statusCode: 400, message: 'Le client doit avoir une adresse e-mail.' })
  const snapshot = contract.snapshot || contractSnapshot(contract, organization || org, client)
  const snapshotHash = contract.snapshot_hash || hashContractSnapshot(snapshot)
  if (!contract.snapshot) {
    const { error } = await supabase.from('contracts').update({ snapshot, snapshot_hash: snapshotHash, updated_at: new Date().toISOString() })
      .eq('organization_id', org.id).eq('id', id).eq('status', 'draft')
    if (error) throw createError({ statusCode: 500, message: 'Impossible de figer cette version du contrat.' })
  }
  const portalUrl = `${String(useRuntimeConfig().public?.siteUrl || 'https://www.antoinequarroz.ch').replace(/\/$/, '')}/portal#contrats`
  const name = escapeEmailHtml(client.name)
  const number = escapeEmailHtml(contract.number)
  const result = await sendTrackedEmail({
    organizationId: org.id,
    clientId: client.id,
    category: 'transactional',
    templateKey: 'contract_available',
    locale: ['fr', 'en', 'de'].includes(client.preferred_locale) ? client.preferred_locale : 'fr',
    recipient: client.email,
    entityType: 'contract',
    entityId: id,
    idempotencyKey: `contract-${id}-${snapshotHash}`,
    subject: `Contrat ${contract.number} à consulter`,
    text: `Bonjour ${client.name},\n\nLe contrat ${contract.number} est disponible dans votre espace client. Consultez le PDF puis enregistrez votre décision.\n\n${portalUrl}`,
    html: `<p>Bonjour ${name},</p><p>Le contrat <strong>${number}</strong> est disponible dans votre espace client.</p><p>Consultez la version complète avant d’enregistrer votre décision.</p><p><a href="${portalUrl}">Consulter le contrat</a></p>`,
  })
  const sentAt = contract.sent_at || new Date().toISOString()
  const { data: updated, error: updateError } = await supabase.from('contracts').update({ status: 'sent', sent_at: sentAt, snapshot, snapshot_hash: snapshotHash, updated_at: sentAt })
    .eq('organization_id', org.id).eq('id', id).in('status', ['draft', 'sent']).select('*').maybeSingle()
  if (updateError || !updated) throw createError({ statusCode: 500, message: 'Le message est parti, mais le statut du contrat doit être vérifié.' })
  await logAudit({ organizationId: org.id, actorUserId: user?.id, action: 'contract.email_sent', entityType: 'contract', entityId: id, clientId: client.id, payload: { number: contract.number, version: contract.version, snapshot_hash: snapshotHash, email_id: result.emailId } })
  return updated
})
