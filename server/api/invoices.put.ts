import { computeTotals, normalizeBillingCurrency, normalizeBillingItems } from '../utils/billing'
import { normalizeInvoicePaymentState } from '../utils/invoiceState'
import { getQrReferenceError, isSwissQrReferenceType, normalizeIban, validateQrReference } from '../../shared/utils/swissQr'
import { hasLockedInvoiceContentMutation, isInvoiceLocked } from '../utils/invoiceLock'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) throw createError({ statusCode: 400, message: 'Missing invoice id' })

  const supabase = getSupabaseAdmin()
  const { data: existing, error: existingError } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', org.id)
    .eq('id', id)
    .single()
  if (existingError || !existing) throw createError({ statusCode: 404, message: 'Facture introuvable.' })

  const isLocked = isInvoiceLocked(existing)
  if (isLocked && hasLockedInvoiceContentMutation(body)) {
    throw createError({
      statusCode: 409,
      message: 'Ce document a été émis et son contenu comptable est verrouillé. Duplique-le ou crée un avoir pour le corriger.',
    })
  }

  let paymentState
  try {
    paymentState = normalizeInvoicePaymentState(body.status ?? existing.status, body.paidAt ?? existing.paid_at)
  }
  catch (error) {
    throw createError({ statusCode: 400, message: error instanceof Error ? error.message : 'Invalid invoice state' })
  }
  if (isLocked && paymentState.status === 'draft') {
    throw createError({ statusCode: 409, message: 'Un document émis ne peut pas redevenir brouillon.' })
  }

  const hasItems = Object.hasOwn(body, 'items')
  const items = hasItems ? normalizeBillingItems(body.items) : []
  const totals = hasItems
    ? computeTotals(items)
    : {
        subtotalCents: Number(existing.subtotal_cents ?? existing.amount_cents ?? 0),
        taxCents: Number(existing.tax_cents ?? 0),
        totalCents: Number(existing.total_cents ?? existing.amount_cents ?? 0),
      }
  let currency
  try {
    currency = normalizeBillingCurrency(Object.hasOwn(body, 'currency') ? body.currency : existing.currency)
  }
  catch (error) {
    throw createError({ statusCode: 400, message: error instanceof Error ? error.message : 'Devise invalide.' })
  }

  const referenceType = String(body.paymentReferenceType ?? existing.payment_reference_type ?? 'NON').toUpperCase()
  if (!isSwissQrReferenceType(referenceType)) {
    throw createError({ statusCode: 400, message: 'Type de référence QR invalide.' })
  }
  const { data: billingOrg } = await supabase.from('organizations').select('billing_iban').eq('id', org.id).single()
  const billingIban = normalizeIban(String(billingOrg?.billing_iban || ''))
  const rawReference = body.paymentReference ?? existing.payment_reference
  const isCreditNote = existing.document_type === 'credit_note'
  const referenceError = isCreditNote ? null : getQrReferenceError(billingIban, referenceType, rawReference)
  if (referenceError) throw createError({ statusCode: 400, message: referenceError })
  const normalizedReference = isCreditNote
    ? { type: 'NON' as const, reference: null }
    : validateQrReference(billingIban, referenceType, rawReference)!

  const payload = isLocked
    ? {
        status: paymentState.status,
        paid_at: paymentState.paidAt,
        notes: Object.hasOwn(body, 'notes') ? body.notes || null : existing.notes,
        locked_at: existing.locked_at || new Date().toISOString(),
      }
    : {
        client_id: Object.hasOwn(body, 'clientId') ? (body.clientId ? Number(body.clientId) : null) : existing.client_id,
        quote_id: Object.hasOwn(body, 'quoteId') ? (body.quoteId ? Number(body.quoteId) : null) : existing.quote_id,
        project_id: Object.hasOwn(body, 'projectId') ? (body.projectId ? Number(body.projectId) : null) : existing.project_id,
        number: Object.hasOwn(body, 'number') ? String(body.number || '').trim() : existing.number,
        amount_cents: totals.totalCents,
        subtotal_cents: totals.subtotalCents,
        tax_cents: totals.taxCents,
        total_cents: totals.totalCents,
        currency,
        status: paymentState.status,
        issued_at: Object.hasOwn(body, 'issuedAt') ? body.issuedAt || null : existing.issued_at,
        due_at: Object.hasOwn(body, 'dueAt') ? body.dueAt || null : existing.due_at,
        paid_at: paymentState.paidAt,
        notes: Object.hasOwn(body, 'notes') ? body.notes || null : existing.notes,
        payment_reference_type: normalizedReference.type,
        payment_reference: normalizedReference.reference,
        locked_at: paymentState.status === 'draft' ? null : new Date().toISOString(),
      }

  const { data, error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('organization_id', org.id)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw createError({ statusCode: 500, message: error.message })

  if (hasItems) {
    await supabase.from('invoice_items').delete().eq('organization_id', org.id).eq('invoice_id', id)
    if (items.length) {
      const rows = items.map(item => ({ ...item, organization_id: org.id, invoice_id: id }))
      const { error: itemError } = await supabase.from('invoice_items').insert(rows)
      if (itemError) throw createError({ statusCode: 500, message: itemError.message })
    }
  }

  const [{ data: storedItems }, { data: storedPayments }] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('*')
      .eq('organization_id', org.id)
      .eq('invoice_id', id)
      .order('position', { ascending: true }),
    supabase
      .from('invoice_payments')
      .select('*')
      .eq('organization_id', org.id)
      .eq('invoice_id', id)
      .order('paid_at', { ascending: false }),
  ])

  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'invoice.update',
    entityType: 'invoice',
    entityId: data.id,
    clientId: data.client_id,
    payload: { number: data.number, status: data.status, amount_cents: data.amount_cents, locked: Boolean(data.locked_at) },
  })
  return { ...data, items: storedItems || [], payments: storedPayments || [] }
})
