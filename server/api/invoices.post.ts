import { computeTotals, normalizeBillingCurrency, normalizeBillingItems } from '../utils/billing'
import { normalizeInvoicePaymentState } from '../utils/invoiceState'
import { getQrReferenceError, isSwissQrReferenceType, normalizeIban, validateQrReference } from '../../shared/utils/swissQr'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()
  const documentType = body.documentType === 'credit_note' ? 'credit_note' : 'invoice'
  const creditedInvoiceId = documentType === 'credit_note' ? Number(body.creditedInvoiceId || 0) : 0
  if (documentType === 'credit_note') {
    if (!creditedInvoiceId) throw createError({ statusCode: 400, message: 'La facture créditée est obligatoire.' })
    const { data: creditedInvoice } = await supabase
      .from('invoices')
      .select('id,currency,document_type')
      .eq('organization_id', org.id)
      .eq('id', creditedInvoiceId)
      .single()
    if (!creditedInvoice || creditedInvoice.document_type === 'credit_note') {
      throw createError({ statusCode: 400, message: 'La facture créditée est invalide.' })
    }
  }
  const items = normalizeBillingItems(body.items)
  const totals = computeTotals(items)
  let currency
  try {
    currency = normalizeBillingCurrency(body.currency)
  }
  catch (error) {
    throw createError({ statusCode: 400, message: error instanceof Error ? error.message : 'Devise invalide.' })
  }
  let paymentState
  try {
    paymentState = normalizeInvoicePaymentState(body.status, body.paidAt)
  }
  catch (error) {
    throw createError({ statusCode: 400, message: error instanceof Error ? error.message : 'Invalid invoice state' })
  }
  const referenceType = documentType === 'credit_note' ? 'NON' : String(body.paymentReferenceType || 'NON').toUpperCase()
  if (!isSwissQrReferenceType(referenceType)) {
    throw createError({ statusCode: 400, message: 'Type de référence QR invalide.' })
  }
  const { data: billingOrg } = await supabase.from('organizations').select('billing_iban').eq('id', org.id).single()
  const billingIban = normalizeIban(String(billingOrg?.billing_iban || ''))
  const referenceError = documentType === 'credit_note' ? null : getQrReferenceError(billingIban, referenceType, body.paymentReference)
  if (referenceError) throw createError({ statusCode: 400, message: referenceError })
  const normalizedReference = documentType === 'credit_note'
    ? { type: 'NON' as const, reference: null }
    : validateQrReference(billingIban, referenceType, body.paymentReference)!
  const payload = {
    organization_id: org.id,
    client_id: body.clientId ? Number(body.clientId) : null,
    quote_id: body.quoteId ? Number(body.quoteId) : null,
    number: String(body.number || '').trim(),
    amount_cents: totals.totalCents || Number(body.amountCents || 0),
    subtotal_cents: totals.subtotalCents,
    tax_cents: totals.taxCents,
    total_cents: totals.totalCents || Number(body.amountCents || 0),
    currency,
    status: paymentState.status,
    issued_at: body.issuedAt || null,
    due_at: body.dueAt || null,
    paid_at: paymentState.paidAt,
    notes: body.notes || null,
    document_type: documentType,
    credited_invoice_id: creditedInvoiceId || null,
    locked_at: paymentState.status === 'draft' ? null : new Date().toISOString(),
    payment_reference_type: normalizedReference.type,
    payment_reference: normalizedReference.reference,
  }
  if (!payload.number) throw createError({ statusCode: 400, message: 'Missing number' })
  let { data, error } = await supabase.from('invoices').insert(payload).select('*').single()
  if (error && (error.message.includes('subtotal_cents') || error.message.includes('tax_cents') || error.message.includes('total_cents') || error.message.includes('payment_reference'))) {
    const legacyPayload = {
      organization_id: payload.organization_id,
      client_id: payload.client_id,
      quote_id: payload.quote_id,
      number: payload.number,
      amount_cents: payload.amount_cents,
      currency: payload.currency,
      status: payload.status,
      issued_at: payload.issued_at,
      due_at: payload.due_at,
      paid_at: payload.paid_at,
      notes: payload.notes,
    }
    const retry = await supabase.from('invoices').insert(legacyPayload).select('*').single()
    data = retry.data
    error = retry.error
  }
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (items.length) {
    const rows = items.map(item => ({ ...item, organization_id: org.id, invoice_id: data.id }))
    await supabase.from('invoice_items').insert(rows)
  }
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'invoice.create',
    entityType: 'invoice',
    entityId: data.id,
    clientId: data.client_id,
    payload: { number: data.number, status: data.status, amount_cents: data.amount_cents },
  })
  return { ...data, items }
})
