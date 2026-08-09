export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const { id } = getQuery(event)
  const numericId = Number(id)
  if (!numericId) throw createError({ statusCode: 400, message: 'Missing invoice id' })
  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('invoices')
    .select('id,number,status,amount_cents,client_id')
    .eq('organization_id', org.id)
    .eq('id', numericId)
    .single()
  if (!existing) throw createError({ statusCode: 404, message: 'Facture introuvable.' })
  if (existing.status !== 'draft') {
    throw createError({ statusCode: 409, message: 'Un document émis ne peut plus être supprimé. Annule-le ou crée un avoir.' })
  }
  const { error } = await supabase.from('invoices').delete().eq('organization_id', org.id).eq('id', numericId)
  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'invoice.delete',
    entityType: 'invoice',
    entityId: numericId,
    clientId: existing?.client_id ?? null,
    payload: existing || { id: numericId },
  })
  return { success: true }
})
