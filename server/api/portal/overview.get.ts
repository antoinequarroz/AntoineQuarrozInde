export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event, { requireAuth: true, minRole: 'client' })
  const user = event.context.user
  if (!user?.email) throw createError({ statusCode: 403, message: 'Adresse e-mail utilisateur manquante' })

  const supabase = getSupabaseAdmin()
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id,name,company,email')
    .eq('organization_id', org.id)
    .ilike('email', user.email)
    .maybeSingle()
  if (clientError) throw createError({ statusCode: 500, message: clientError.message })
  if (!client) throw createError({ statusCode: 403, message: 'Aucune fiche client liée à ce compte' })

  const [projects, quotes, invoices] = await Promise.all([
    supabase.from('projects').select('id,title,category,description,image,live_url,created_at').eq('organization_id', org.id).eq('client_id', client.id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('id,number,title,total_cents,currency,status,issued_at,valid_until,created_at').eq('organization_id', org.id).eq('client_id', client.id).neq('status', 'draft').order('created_at', { ascending: false }),
    supabase.from('invoices').select('id,number,total_cents,currency,status,document_type,issued_at,due_at,paid_at,created_at').eq('organization_id', org.id).eq('client_id', client.id).neq('status', 'draft').order('created_at', { ascending: false }),
  ])
  const firstError = projects.error || quotes.error || invoices.error
  if (firstError) throw createError({ statusCode: 500, message: firstError.message })

  const invoiceIds = (invoices.data || []).map(invoice => invoice.id)
  const payments = invoiceIds.length
    ? await supabase.from('invoice_payments').select('invoice_id,amount_cents,voided_at').eq('organization_id', org.id).in('invoice_id', invoiceIds)
    : { data: [], error: null }
  if (payments.error) throw createError({ statusCode: 500, message: payments.error.message })

  const paidByInvoice = new Map<number, number>()
  for (const payment of payments.data || []) {
    if (!payment.voided_at) paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) || 0) + Number(payment.amount_cents))
  }
  const portalInvoices = (invoices.data || []).map(invoice => ({
    ...invoice,
    paid_amount_cents: paidByInvoice.get(invoice.id) || 0,
  }))

  return {
    organization: { name: org.name },
    client,
    projects: projects.data || [],
    quotes: quotes.data || [],
    invoices: portalInvoices,
    payments: { twintAvailable: Boolean(useRuntimeConfig().stripeSecretKey) },
  }
})
