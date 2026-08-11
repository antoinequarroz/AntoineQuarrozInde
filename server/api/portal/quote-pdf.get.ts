import { buildBillingDocument } from '../../utils/billingDocument'

export default defineEventHandler(async (event) => {
  const { org, client } = await requirePortalClient(event)
  const id = Number(getQuery(event).id)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Devis invalide.' })
  const supabase = getSupabaseAdmin()
  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('organization_id', org.id)
    .eq('client_id', client.id)
    .eq('id', id)
    .neq('status', 'draft')
    .maybeSingle()
  if (!quote) throw createError({ statusCode: 404, message: 'Devis introuvable.' })

  const [{ data: organization }, { data: items }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', org.id).single(),
    supabase.from('quote_items').select('*').eq('organization_id', org.id).eq('quote_id', id).order('position', { ascending: true }),
  ])
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
