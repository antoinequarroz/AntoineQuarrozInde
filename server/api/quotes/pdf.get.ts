import { buildBillingDocument } from '../../utils/billingDocument'

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

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', org.id)
    .single()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', org.id)
    .eq('id', quote.client_id)
    .single()
  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('organization_id', org.id)
    .eq('quote_id', id)
    .order('position', { ascending: true })

  const { pdf, engine } = await buildBillingDocument({
    kind: 'quote',
    document: quote,
    organization: organization || org,
    client,
    items: items || [],
  })

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="devis-${quote.number}.pdf"`)
  setHeader(event, 'X-PDF-Engine', engine)
  return pdf
})
