export default defineEventHandler(async (event) => {
  const { org, user, client } = await requirePortalClient(event)
  const body = await readBody<Record<string, unknown>>(event)
  const quoteId = Number(body.quoteId)
  if (!Number.isInteger(quoteId) || quoteId <= 0 || body.confirmed !== true) {
    throw createError({ statusCode: 400, message: 'Confirmez explicitement l’acceptation du devis.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: quote, error } = await supabase.from('quotes')
    .select('id,number,title,status,valid_until,accepted_at')
    .eq('organization_id', org.id)
    .eq('client_id', client.id)
    .eq('id', quoteId)
    .neq('status', 'draft')
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!quote) throw createError({ statusCode: 404, message: 'Devis introuvable.' })
  if (quote.status === 'accepted') return { accepted: true, acceptedAt: quote.accepted_at, duplicate: true }
  if (quote.status !== 'sent') throw createError({ statusCode: 409, message: 'Ce devis ne peut plus être accepté.' })
  if (quote.valid_until && quote.valid_until < new Date().toISOString().slice(0, 10)) {
    throw createError({ statusCode: 409, message: 'Ce devis est arrivé à expiration. Contactez Antoine pour une nouvelle version.' })
  }

  const acceptedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase.from('quotes').update({
    status: 'accepted',
    accepted_at: acceptedAt,
    accepted_by_user_id: user.id,
    acceptance_ip: getRequestIP(event, { xForwardedFor: true }) || null,
    acceptance_user_agent: String(getHeader(event, 'user-agent') || '').slice(0, 1000) || null,
  }).eq('organization_id', org.id).eq('client_id', client.id).eq('id', quote.id).eq('status', 'sent').select('id,status,accepted_at').maybeSingle()
  if (updateError) throw createError({ statusCode: 500, message: updateError.message })
  if (!updated) throw createError({ statusCode: 409, message: 'Le devis a été modifié. Rechargez votre espace avant de réessayer.' })

  await logAudit({
    organizationId: org.id,
    actorUserId: user.id,
    action: 'quote.portal_accepted',
    entityType: 'quote',
    entityId: quote.id,
    clientId: client.id,
    payload: { number: quote.number, accepted_at: acceptedAt },
  })
  return { accepted: true, acceptedAt }
})
