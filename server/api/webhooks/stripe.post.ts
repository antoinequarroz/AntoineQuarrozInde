import type Stripe from 'stripe'
import { invoiceStatusFromPayments } from '../../utils/invoicePayments'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const webhookSecret = String(config.stripeWebhookSecret || '')
  if (!webhookSecret) throw createError({ statusCode: 503, message: 'Webhook Stripe non configuré.' })

  const signature = getHeader(event, 'stripe-signature')
  const rawBody = await readRawBody(event, false)
  if (!signature || !rawBody) throw createError({ statusCode: 400, message: 'Signature Stripe manquante.' })

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret)
  }
  catch {
    throw createError({ statusCode: 400, message: 'Signature Stripe invalide.' })
  }

  if (stripeEvent.type !== 'checkout.session.completed') return { received: true }
  const session = stripeEvent.data.object as Stripe.Checkout.Session
  if (session.payment_status !== 'paid') return { received: true }

  const organizationId = String(session.metadata?.organization_id || '')
  const invoiceId = Number(session.metadata?.invoice_id)
  const clientId = Number(session.metadata?.client_id)
  const providerPaymentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.id
  const amountCents = Number(session.amount_total || 0)
  if (!organizationId || !invoiceId || !amountCents) throw createError({ statusCode: 400, message: 'Métadonnées de paiement incomplètes.' })

  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('invoice_payments')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'stripe')
    .eq('provider_payment_id', providerPaymentId)
    .maybeSingle()
  if (existing) return { received: true, duplicate: true }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id,total_cents,amount_cents,due_at,status,currency,client_id')
    .eq('organization_id', organizationId)
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice || invoice.currency !== 'CHF' || invoice.status === 'cancelled') {
    throw createError({ statusCode: 409, message: 'La facture liée au paiement est invalide.' })
  }

  const paidAt = new Date(stripeEvent.created * 1000).toISOString().slice(0, 10)
  const { data: inserted, error: insertError } = await supabase.from('invoice_payments').insert({
    organization_id: organizationId,
    invoice_id: invoiceId,
    amount_cents: amountCents,
    currency: 'CHF',
    method: 'twint',
    paid_at: paidAt,
    reference: session.id,
    notes: 'Paiement TWINT confirmé automatiquement.',
    provider: 'stripe',
    provider_payment_id: providerPaymentId,
  }).select('id').single()
  if (insertError) {
    if (insertError.code === '23505') return { received: true, duplicate: true }
    throw createError({ statusCode: 500, message: insertError.message })
  }

  const { data: payments } = await supabase
    .from('invoice_payments')
    .select('amount_cents,voided_at')
    .eq('organization_id', organizationId)
    .eq('invoice_id', invoiceId)
  const paidAmountCents = (payments || []).reduce((sum, payment) => sum + (payment.voided_at ? 0 : Number(payment.amount_cents)), 0)
  const status = invoiceStatusFromPayments({ totalCents: Number(invoice.total_cents ?? invoice.amount_cents ?? 0), paidAmountCents, dueAt: invoice.due_at })
  await supabase.from('invoices').update({ status, paid_at: status === 'paid' ? paidAt : null, locked_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', invoiceId)
  await logAudit({
    organizationId,
    action: 'invoice.twint_payment_confirmed',
    entityType: 'invoice',
    entityId: invoiceId,
    clientId: Number.isFinite(clientId) ? clientId : invoice.client_id,
    payload: { payment_id: inserted.id, stripe_session_id: session.id, amount_cents: amountCents },
  })
  return { received: true }
})
