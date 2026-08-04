import { buildBillingDocument } from '../../utils/billingDocument'

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

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', org.id)
    .single()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', org.id)
    .eq('id', invoice.client_id)
    .single()
  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('organization_id', org.id)
    .eq('invoice_id', id)
    .order('position', { ascending: true })

  const { pdf, engine } = await buildBillingDocument({
    kind: 'invoice',
    document: invoice,
    organization: organization || org,
    client,
    items: items || [],
  })

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="facture-${invoice.number}.pdf"`)
  setHeader(event, 'X-PDF-Engine', engine)
  return pdf
})
