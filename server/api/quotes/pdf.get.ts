import { buildBillingPdf } from '../../utils/pdfBilling'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const id = Number(getQuery(event).id)
  if (!id) throw createError({ statusCode: 400, message: 'Missing quote id' })
  const supabase = getSupabaseAdmin()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('organization_id', org.id)
    .eq('id', id)
    .single()
  if (error || !quote) throw createError({ statusCode: 404, message: 'Quote not found' })

  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('organization_id', org.id)
    .eq('id', quote.client_id)
    .single()
  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('organization_id', org.id)
    .eq('quote_id', id)
    .order('position', { ascending: true })

  const pdf = await buildBillingPdf({
    title: 'Devis',
    number: quote.number,
    clientName: client?.name || '-',
    currency: quote.currency,
    issuedAt: quote.issued_at,
    status: quote.status,
    notes: quote.notes,
    subtotalCents: quote.subtotal_cents ?? quote.amount_cents,
    taxCents: quote.tax_cents ?? 0,
    totalCents: quote.total_cents ?? quote.amount_cents,
    items: (items || []).map(item => ({
      label: item.label,
      quantity: Number(item.quantity),
      unitPriceCents: item.unit_price_cents,
      taxRate: Number(item.tax_rate),
      totalCents: item.total_cents,
    })),
  })

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="devis-${quote.number}.pdf"`)
  return pdf
})
