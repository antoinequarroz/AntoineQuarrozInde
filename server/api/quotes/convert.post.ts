export default defineEventHandler(async (event) => {
  const correlationId = resolveCommercialCorrelationId(event)
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const quoteId = Number(body?.id)
  if (!Number.isSafeInteger(quoteId) || quoteId <= 0) {
    throw createError({ statusCode: 400, message: 'Devis invalide.' })
  }
  if (body?.confirmation !== 'ACCEPTER_ET_FACTURER') {
    throw createError({ statusCode: 400, message: 'Confirme explicitement l’acceptation du devis avant de créer la facture.' })
  }
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('convert_quote_to_invoice_atomic', {
    p_organization_id: org.id,
    p_quote_id: quoteId,
  })

  if (error) {
    const reason = String(error.message || '')
    if (reason.includes('quote_not_found')) {
      throw createError({ statusCode: 404, message: 'Devis introuvable.' })
    }
    if (reason.includes('quote_client_required')) {
      throw createError({ statusCode: 400, message: 'Associe un client au devis avant de le facturer.' })
    }
    if (reason.includes('quote_not_convertible')) {
      throw createError({ statusCode: 409, message: 'Seul un devis envoyé ou accepté peut être facturé.' })
    }
    await recordCommercialWorkflowEvent({
      event,
      correlationId,
      organizationId: org.id,
      actorUserId: user?.id,
      stage: 'quote',
      outcome: 'failure',
      entityType: 'quote',
      entityId: quoteId,
      code: 'quote_conversion_failed',
    })
    throw createError({ statusCode: 500, message: 'La conversion transactionnelle du devis a échoué.' })
  }

  const result = data as { created?: boolean, invoice?: Record<string, any> } | null
  if (!result?.invoice?.id) {
    await recordCommercialWorkflowEvent({
      event,
      correlationId,
      organizationId: org.id,
      actorUserId: user?.id,
      stage: 'quote',
      outcome: 'failure',
      entityType: 'quote',
      entityId: quoteId,
      code: 'quote_conversion_empty',
    })
    throw createError({ statusCode: 500, message: 'La conversion n’a retourné aucune facture.' })
  }

  if (result.created) {
    await logAudit({
      organizationId: org.id,
      actorUserId: user?.id,
      action: 'quote.convert_to_invoice',
      entityType: 'invoice',
      entityId: result.invoice.id,
      clientId: result.invoice.client_id,
      payload: {
        quoteId,
        projectId: result.invoice.project_id,
        invoiceNumber: result.invoice.number,
      },
    })
  }

  await recordCommercialWorkflowEvent({
    event,
    correlationId,
    organizationId: org.id,
    actorUserId: user?.id,
    stage: 'quote',
    outcome: result.created ? 'success' : 'recovered',
    entityType: 'invoice',
    entityId: result.invoice.id,
    clientId: result.invoice.client_id,
    code: result.created ? null : 'invoice_already_created',
  })

  if (result.created) {
    await capturePostHogBusinessEvent({
      event: 'quote_accepted',
      origin: 'quote_conversion',
      organizationId: org.id,
      entityType: 'quote',
      entityId: quoteId,
      clientId: result.invoice.client_id,
      amountCents: result.invoice.total_cents ?? result.invoice.amount_cents,
      currency: result.invoice.currency,
      projectId: result.invoice.project_id,
    })
    await capturePostHogBusinessEvent({
      event: 'invoice_created',
      origin: 'quote_conversion',
      organizationId: org.id,
      entityType: 'invoice',
      entityId: result.invoice.id,
      clientId: result.invoice.client_id,
      amountCents: result.invoice.total_cents ?? result.invoice.amount_cents,
      currency: result.invoice.currency,
      projectId: result.invoice.project_id,
    })
  }

  return { created: Boolean(result.created), invoice: result.invoice }
})
