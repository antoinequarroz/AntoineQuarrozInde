import { invoiceStatusFromPayments, normalizeInvoicePayment } from '../../utils/invoicePayments'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const invoiceId = Number(body.invoiceId)
  if (!invoiceId) throw createError({ statusCode: 400, message: 'Facture invalide.' })

  let payment
  try {
    payment = normalizeInvoicePayment(body)
  }
  catch (error) {
    throw createError({ statusCode: 400, message: error instanceof Error ? error.message : 'Paiement invalide.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id,number,client_id,total_cents,amount_cents,currency,due_at,status')
    .eq('organization_id', org.id)
    .eq('id', invoiceId)
    .single()
  if (!invoice) throw createError({ statusCode: 404, message: 'Facture introuvable.' })
  if (invoice.status === 'cancelled') throw createError({ statusCode: 409, message: 'Aucun paiement ne peut être ajouté à un document annulé.' })

  const { data: existingPayments } = await supabase
    .from('invoice_payments')
    .select('amount_cents,voided_at')
    .eq('organization_id', org.id)
    .eq('invoice_id', invoiceId)
  const paidBefore = (existingPayments || []).reduce((sum, row) => sum + (row.voided_at ? 0 : Number(row.amount_cents)), 0)
  const totalCents = Number(invoice.total_cents ?? invoice.amount_cents ?? 0)
  if (paidBefore + payment.amountCents > totalCents) {
    throw createError({ statusCode: 400, message: `Le paiement dépasse le solde restant de ${((totalCents - paidBefore) / 100).toFixed(2)} ${invoice.currency}.` })
  }

  const { data: inserted, error } = await supabase.from('invoice_payments').insert({
    organization_id: org.id,
    invoice_id: invoiceId,
    amount_cents: payment.amountCents,
    currency: invoice.currency,
    method: payment.method,
    paid_at: payment.paidAt,
    reference: payment.reference,
    notes: payment.notes,
  }).select('*').single()
  if (error) throw createError({ statusCode: 500, message: error.message })

  const paidAmountCents = paidBefore + payment.amountCents
  const status = invoiceStatusFromPayments({ totalCents, paidAmountCents, dueAt: invoice.due_at })
  await supabase.from('invoices').update({
    status,
    paid_at: status === 'paid' ? payment.paidAt : null,
    locked_at: new Date().toISOString(),
  }).eq('organization_id', org.id).eq('id', invoiceId)

  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'invoice.payment_recorded',
    entityType: 'invoice',
    entityId: invoiceId,
    clientId: invoice.client_id,
    payload: { payment_id: inserted.id, amount_cents: payment.amountCents, method: payment.method },
  })
  return { payment: inserted, paidAmountCents, status }
})
