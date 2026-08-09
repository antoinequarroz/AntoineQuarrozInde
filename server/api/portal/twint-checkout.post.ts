import { getTwintBalance, getTwintEligibility, isTwintConfigured } from '../../utils/twint'

export default defineEventHandler(async (event) => {
  const { org, user, client } = await requirePortalClient(event)

  const body = await readBody(event)
  const invoiceId = Number(body.invoiceId)
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) throw createError({ statusCode: 400, message: 'Facture invalide.' })

  const supabase = getSupabaseAdmin()
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
  }, isTwintConfigured(useRuntimeConfig()))
  if (!eligibility.eligible) throw createError({ statusCode: 409, message: eligibility.reason || 'Paiement TWINT indisponible.' })

  const config = useRuntimeConfig()
  const now = new Date()
  await supabase.from('payment_checkout_sessions').update({ status: 'expired' })
    .eq('organization_id', org.id).eq('invoice_id', invoice.id).eq('status', 'created').lte('expires_at', now.toISOString())
  const { data: existingSession } = await supabase.from('payment_checkout_sessions')
    .select('checkout_url,provider_session_id,expires_at')
    .eq('organization_id', org.id).eq('invoice_id', invoice.id).eq('client_id', client.id).eq('status', 'created').gt('expires_at', now.toISOString()).maybeSingle()
  if (existingSession) return { url: existingSession.checkout_url, sessionId: existingSession.provider_session_id, reused: true }

  const stripe = getStripeClient()
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
  const expiresAt = new Date(session.expires_at * 1000).toISOString()

  const { error: sessionError } = await supabase.from('payment_checkout_sessions').insert({
    organization_id: org.id,
    invoice_id: invoice.id,
    client_id: client.id,
    provider: 'stripe',
    provider_session_id: session.id,
    checkout_url: session.url,
    amount_cents: amountCents,
    currency: 'CHF',
    status: 'created',
    expires_at: expiresAt,
    created_by_user_id: user.id,
  })
  if (sessionError) {
    if (sessionError.code === '23505') {
      const { data: concurrentSession } = await supabase.from('payment_checkout_sessions').select('checkout_url,provider_session_id').eq('organization_id', org.id).eq('invoice_id', invoice.id).eq('status', 'created').maybeSingle()
      if (concurrentSession) return { url: concurrentSession.checkout_url, sessionId: concurrentSession.provider_session_id, reused: true }
    }
    throw createError({ statusCode: 500, message: sessionError.message })
  }

  await logAudit({
    organizationId: org.id,
    actorUserId: user.id,
    action: 'invoice.twint_checkout_created',
    entityType: 'invoice',
    entityId: invoice.id,
    clientId: client.id,
    payload: { stripe_session_id: session.id, amount_cents: amountCents },
  })
  return { url: session.url, sessionId: session.id, reused: false }
})
