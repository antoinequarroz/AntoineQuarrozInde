import { getTwintBalance, getTwintEligibility } from '../../utils/twint'

export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event, { requireAuth: true, minRole: 'client' })
  const user = event.context.user
  if (!user?.email) throw createError({ statusCode: 403, message: 'Adresse e-mail utilisateur manquante.' })

  const body = await readBody(event)
  const invoiceId = Number(body.invoiceId)
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) throw createError({ statusCode: 400, message: 'Facture invalide.' })

  const supabase = getSupabaseAdmin()
  const { data: client } = await supabase
    .from('clients')
    .select('id,name,email')
    .eq('organization_id', org.id)
    .ilike('email', user.email)
    .maybeSingle()
  if (!client) throw createError({ statusCode: 403, message: 'Aucune fiche client liée à ce compte.' })

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id,number,client_id,total_cents,amount_cents,currency,status,document_type')
    .eq('organization_id', org.id)
    .eq('client_id', client.id)
    .eq('id', invoiceId)
    .neq('status', 'draft')
    .maybeSingle()
  if (invoiceError) throw createError({ statusCode: 500, message: invoiceError.message })
  if (!invoice) throw createError({ statusCode: 404, message: 'Facture introuvable.' })

  const { data: payments, error: paymentError } = await supabase
    .from('invoice_payments')
    .select('amount_cents,voided_at')
    .eq('organization_id', org.id)
    .eq('invoice_id', invoice.id)
  if (paymentError) throw createError({ statusCode: 500, message: paymentError.message })

  const paidAmountCents = (payments || []).reduce((sum, payment) => sum + (payment.voided_at ? 0 : Number(payment.amount_cents)), 0)
  const totalCents = Number(invoice.total_cents ?? invoice.amount_cents ?? 0)
  const eligibility = getTwintEligibility({
    status: invoice.status,
    currency: invoice.currency,
    documentType: invoice.document_type,
    totalCents,
    paidAmountCents,
  }, Boolean(useRuntimeConfig().stripeSecretKey))
  if (!eligibility.eligible) throw createError({ statusCode: 409, message: eligibility.reason || 'Paiement TWINT indisponible.' })

  const stripe = getStripeClient()
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '')
  const amountCents = getTwintBalance({ status: invoice.status, currency: invoice.currency, documentType: invoice.document_type, totalCents, paidAmountCents })
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['twint'],
    customer_email: client.email || user.email,
    client_reference_id: String(invoice.id),
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'chf',
        unit_amount: amountCents,
        product_data: { name: `Facture ${invoice.number}` },
      },
    }],
    metadata: {
      organization_id: org.id,
      invoice_id: String(invoice.id),
      client_id: String(client.id),
      invoice_number: invoice.number,
    },
    success_url: `${siteUrl}/portal?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/portal?payment=cancelled`,
  })
  if (!session.url) throw createError({ statusCode: 502, message: 'Stripe n’a pas retourné de page de paiement.' })

  await logAudit({
    organizationId: org.id,
    actorUserId: user.id,
    action: 'invoice.twint_checkout_created',
    entityType: 'invoice',
    entityId: invoice.id,
    clientId: client.id,
    payload: { stripe_session_id: session.id, amount_cents: amountCents },
  })
  return { url: session.url }
})
