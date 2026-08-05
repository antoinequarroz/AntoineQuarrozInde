import { addDaysIso, nextBillingNumber, paymentTermsFromNotes } from '../../utils/billingWorkflow'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const quoteId = Number((await readBody(event))?.id)
  if (!quoteId) throw createError({ statusCode: 400, message: 'Devis invalide.' })
  const supabase = getSupabaseAdmin()

  const { data: existing } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', org.id)
    .eq('quote_id', quoteId)
    .maybeSingle()
  if (existing) return { created: false, invoice: existing }

  const [{ data: quote, error }, { data: items }, { data: invoiceNumbers }] = await Promise.all([
    supabase.from('quotes').select('*').eq('organization_id', org.id).eq('id', quoteId).single(),
    supabase.from('quote_items').select('*').eq('organization_id', org.id).eq('quote_id', quoteId).order('position'),
    supabase.from('invoices').select('number').eq('organization_id', org.id),
  ])
  if (error || !quote) throw createError({ statusCode: 404, message: 'Devis introuvable.' })
  if (!quote.client_id) throw createError({ statusCode: 400, message: 'Associe un client au devis avant de le facturer.' })

  const issuedAt = new Date().toISOString().slice(0, 10)
  const number = nextBillingNumber('invoice', (invoiceNumbers || []).map(row => String(row.number)))
  const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert({
    organization_id: org.id,
    client_id: quote.client_id,
    quote_id: quote.id,
    number,
    amount_cents: quote.amount_cents,
    subtotal_cents: quote.subtotal_cents ?? quote.amount_cents,
    tax_cents: quote.tax_cents ?? 0,
    total_cents: quote.total_cents ?? quote.amount_cents,
    currency: quote.currency,
    status: 'draft',
    issued_at: issuedAt,
    due_at: addDaysIso(issuedAt, paymentTermsFromNotes(quote.notes)),
    notes: `Facture créée depuis le devis ${quote.number}.`,
    payment_reference_type: 'NON',
    payment_reference: null,
  }).select('*').single()
  if (invoiceError || !invoice) throw createError({ statusCode: 500, message: invoiceError?.message || 'Création impossible.' })

  if (items?.length) {
    const rows = items.map(({ id: _id, quote_id: _quoteId, created_at: _createdAt, ...item }) => ({
      ...item,
      invoice_id: invoice.id,
    }))
    const { error: itemsError } = await supabase.from('invoice_items').insert(rows)
    if (itemsError) {
      await supabase.from('invoices').delete().eq('organization_id', org.id).eq('id', invoice.id)
      throw createError({ statusCode: 500, message: itemsError.message })
    }
  }
  if (quote.status !== 'accepted') {
    await supabase.from('quotes').update({ status: 'accepted' }).eq('organization_id', org.id).eq('id', quote.id)
  }
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'quote.convert_to_invoice',
    entityType: 'invoice',
    entityId: invoice.id,
    clientId: quote.client_id,
    payload: { quoteId: quote.id, quoteNumber: quote.number, invoiceNumber: invoice.number },
  })
  return { created: true, invoice }
})
