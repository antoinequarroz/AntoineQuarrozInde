import { buildBillingDocument } from '../../utils/billingDocument'

export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event, { requireAuth: true, minRole: 'client' })
  const user = event.context.user
  const id = Number(getQuery(event).id)
  if (!user?.email || !id) throw createError({ statusCode: 400, message: 'Requête invalide' })
  const supabase = getSupabaseAdmin()

  const { data: client } = await supabase.from('clients').select('*').eq('organization_id', org.id).ilike('email', user.email).maybeSingle()
  if (!client) throw createError({ statusCode: 403, message: 'Accès client introuvable' })
  const { data: invoice } = await supabase.from('invoices').select('*').eq('organization_id', org.id).eq('client_id', client.id).eq('id', id).neq('status', 'draft').maybeSingle()
  if (!invoice) throw createError({ statusCode: 404, message: 'Facture introuvable' })
  const [{ data: organization }, { data: items }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', org.id).single(),
    supabase.from('invoice_items').select('*').eq('organization_id', org.id).eq('invoice_id', id).order('position'),
  ])
  const { pdf } = await buildBillingDocument({ kind: 'invoice', document: invoice, organization: organization || org, client, items: items || [] })
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="facture-${invoice.number}.pdf"`)
  return pdf
})
