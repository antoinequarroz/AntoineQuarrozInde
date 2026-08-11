export default defineEventHandler(async (event) => {
  const { org, user, client } = await requirePortalClient(event)
  const body = await readBody<Record<string, unknown>>(event)
  const quoteId = Number(body.quoteId)
  if (!Number.isInteger(quoteId) || quoteId <= 0 || body.confirmed !== true) {
    throw createError({ statusCode: 400, message: 'Confirmez explicitement le refus du devis.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: quote, error } = await supabase.from('quotes')
    .select('id,number,title,status')
    .eq('organization_id', org.id)
    .eq('client_id', client.id)
    .eq('id', quoteId)
    .neq('status', 'draft')
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!quote) throw createError({ statusCode: 404, message: 'Devis introuvable.' })
  if (quote.status === 'rejected') return { rejected: true, duplicate: true }
  if (quote.status !== 'sent') throw createError({ statusCode: 409, message: 'Ce devis ne peut plus être refusé.' })

  const { data: updated, error: updateError } = await supabase.from('quotes')
    .update({ status: 'rejected' })
    .eq('organization_id', org.id)
    .eq('client_id', client.id)
    .eq('id', quote.id)
    .eq('status', 'sent')
    .select('id,status')
    .maybeSingle()
  if (updateError) throw createError({ statusCode: 500, message: updateError.message })
  if (!updated) throw createError({ statusCode: 409, message: 'Le devis a été modifié. Rechargez votre espace avant de réessayer.' })

  await logAudit({
    organizationId: org.id,
    actorUserId: user.id,
    action: 'quote.portal_rejected',
    entityType: 'quote',
    entityId: quote.id,
    clientId: client.id,
    payload: { number: quote.number },
  })
  await notifyOperationalEvent({
    organizationId: org.id,
    subject: `Devis ${quote.number} refusé par ${client.name}`,
    title: 'Un devis vient d’être refusé',
    body: `<p><strong>${escapeEmailHtml(client.name)}</strong> a refusé le devis <strong>${escapeEmailHtml(quote.number)}</strong>${quote.title ? ` — ${escapeEmailHtml(quote.title)}` : ''}.</p>`,
    action: 'quote.portal_rejected',
    entityType: 'quote',
    entityId: quote.id,
    clientId: client.id,
    idempotencyKey: `quote-rejected-${quote.id}`,
  })
  return { rejected: true }
})
