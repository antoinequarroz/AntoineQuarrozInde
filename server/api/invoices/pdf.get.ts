import { buildBillingPdf } from '../../utils/pdfBilling'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const id = Number(getQuery(event).id)
  if (!id) throw createError({ statusCode: 400, message: 'Missing invoice id' })
  const supabase = getSupabaseAdmin()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', org.id)
    .eq('id', id)
    .single()
  if (error || !invoice) throw createError({ statusCode: 404, message: 'Invoice not found' })

  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('organization_id', org.id)
    .eq('id', invoice.client_id)
    .single()
  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('organization_id', org.id)
    .eq('invoice_id', id)
    .order('position', { ascending: true })

  const pdf = await buildBillingPdf({
    title: 'Facture',
    number: invoice.number,
    clientName: client?.name || '-',
    currency: invoice.currency,
    issuedAt: invoice.issued_at,
    dueAt: invoice.due_at,
    status: invoice.status,
    notes: invoice.notes,
    subtotalCents: invoice.subtotal_cents ?? invoice.amount_cents,
    taxCents: invoice.tax_cents ?? 0,
    totalCents: invoice.total_cents ?? invoice.amount_cents,
    items: (items || []).map(item => ({
      label: item.label,
      quantity: Number(item.quantity),
      unitPriceCents: item.unit_price_cents,
      taxRate: Number(item.tax_rate),
      totalCents: item.total_cents,
    })),
  })

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="facture-${invoice.number}.pdf"`)
  return pdf
})
