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
  try { stripeEvent = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret) }
  catch { throw createError({ statusCode: 400, message: 'Signature Stripe invalide.' }) }

  const supabase = getSupabaseAdmin()
  if (stripeEvent.type === 'checkout.session.expired') {
    const expiredSession = stripeEvent.data.object as Stripe.Checkout.Session
    const { error } = await supabase.from('payment_checkout_sessions').update({ status: 'expired' }).eq('provider', 'stripe').eq('provider_session_id', expiredSession.id).eq('status', 'created')
    if (error) throw createError({ statusCode: 500, message: error.message })
    return { received: true }
  }
  if (stripeEvent.type !== 'checkout.session.completed') return { received: true }

  const session = stripeEvent.data.object as Stripe.Checkout.Session
  if (session.payment_status !== 'paid') return { received: true }
  const organizationId = String(session.metadata?.organization_id || '')
  const invoiceId = Number(session.metadata?.invoice_id)
  const clientId = Number(session.metadata?.client_id)
  const providerPaymentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.id
  const amountCents = Number(session.amount_total || 0)
  if (!organizationId || !Number.isInteger(invoiceId) || !Number.isInteger(clientId) || amountCents <= 0) {
    throw createError({ statusCode: 400, message: 'Métadonnées de paiement incomplètes.' })
  }

  const { data: checkoutSession, error: checkoutSessionError } = await supabase
    .from('payment_checkout_sessions')
    .select('organization_id,invoice_id,client_id,amount_cents,currency,status')
    .eq('provider', 'stripe')
    .eq('provider_session_id', session.id)
    .maybeSingle()
  if (checkoutSessionError) throw createError({ statusCode: 500, message: checkoutSessionError.message })
  if (!checkoutSession
    || checkoutSession.organization_id !== organizationId
    || Number(checkoutSession.invoice_id) !== invoiceId
    || Number(checkoutSession.client_id) !== clientId
    || Number(checkoutSession.amount_cents) !== amountCents
    || checkoutSession.currency !== 'CHF') {
    throw createError({ statusCode: 409, message: 'La session TWINT ne correspond pas au paiement attendu.' })
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id,number,total_cents,amount_cents,due_at,status,currency,client_id')
    .eq('organization_id', organizationId)
    .eq('id', invoiceId)
    .maybeSingle()
  if (invoiceError) throw createError({ statusCode: 500, message: invoiceError.message })
  if (!invoice || invoice.currency !== 'CHF' || invoice.status === 'cancelled' || clientId !== Number(invoice.client_id)) {
    throw createError({ statusCode: 409, message: 'La facture liée au paiement est invalide.' })
  }

  const { data: existing, error: existingError } = await supabase.from('invoice_payments')
    .select('id').eq('organization_id', organizationId).eq('provider', 'stripe').eq('provider_payment_id', providerPaymentId).maybeSingle()
  if (existingError) throw createError({ statusCode: 500, message: existingError.message })

  const completedAt = new Date(stripeEvent.created * 1000).toISOString()
  const paidAt = completedAt.slice(0, 10)
  let paymentId = existing?.id
  let duplicate = Boolean(existing)
  if (!paymentId) {
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
      if (insertError.code !== '23505') throw createError({ statusCode: 500, message: insertError.message })
      const { data: racedPayment, error: racedPaymentError } = await supabase.from('invoice_payments').select('id').eq('organization_id', organizationId).eq('provider', 'stripe').eq('provider_payment_id', providerPaymentId).maybeSingle()
      if (racedPaymentError || !racedPayment) throw createError({ statusCode: 500, message: racedPaymentError?.message || 'Paiement idempotent introuvable.' })
      paymentId = racedPayment.id
      duplicate = true
    }
    else paymentId = inserted.id
  }

  const { data: payments, error: paymentsError } = await supabase.from('invoice_payments')
    .select('amount_cents,voided_at').eq('organization_id', organizationId).eq('invoice_id', invoiceId)
  if (paymentsError) throw createError({ statusCode: 500, message: paymentsError.message })
  const paidAmountCents = (payments || []).reduce((sum, payment) => sum + (payment.voided_at ? 0 : Number(payment.amount_cents)), 0)
  const status = invoiceStatusFromPayments({ totalCents: Number(invoice.total_cents ?? invoice.amount_cents ?? 0), paidAmountCents, dueAt: invoice.due_at })

  const { data: reconciledInvoice, error: invoiceUpdateError } = await supabase.from('invoices')
    .update({ status, paid_at: status === 'paid' ? paidAt : null, locked_at: new Date().toISOString() })
    .eq('organization_id', organizationId).eq('id', invoiceId).select('id').maybeSingle()
  if (invoiceUpdateError || !reconciledInvoice) throw createError({ statusCode: 500, message: invoiceUpdateError?.message || 'La facture n’a pas pu être réconciliée.' })

  const { data: reconciledSession, error: sessionUpdateError } = await supabase.from('payment_checkout_sessions')
    .update({ status: 'completed', completed_at: completedAt })
    .eq('organization_id', organizationId).eq('provider', 'stripe').eq('provider_session_id', session.id).select('id').maybeSingle()
  if (sessionUpdateError || !reconciledSession) throw createError({ statusCode: 500, message: sessionUpdateError?.message || 'La session TWINT n’a pas pu être clôturée.' })

  if (!duplicate) {
    await logAudit({
      organizationId,
      action: 'invoice.twint_payment_confirmed',
      entityType: 'invoice',
      entityId: invoiceId,
      clientId,
      payload: { payment_id: paymentId, stripe_session_id: session.id, amount_cents: amountCents },
    })
    const { data: client } = await supabase.from('clients').select('id,name,email').eq('organization_id', organizationId).eq('id', clientId).maybeSingle()
    const amountLabel = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(amountCents / 100)
    await notifyOperationalEvent({
      organizationId,
      subject: `Paiement TWINT reçu — ${invoice.number}`,
      title: 'Un paiement TWINT est confirmé',
      body: `<p><strong>${escapeEmailHtml(client?.name || 'Un client')}</strong> a payé <strong>${escapeEmailHtml(amountLabel)}</strong> pour la facture <strong>${escapeEmailHtml(invoice.number)}</strong>.</p>`,
      action: 'invoice.twint_payment_confirmed',
      entityType: 'invoice',
      entityId: invoiceId,
      clientId,
      idempotencyKey: `twint-admin-${providerPaymentId}`,
    })
    if (client?.email) {
      try {
        const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '')
        const receipt = await sendTransactionalEmail({
          to: client.email,
          subject: `Paiement reçu — facture ${invoice.number}`,
          html: portalEmailLayout({
            preview: `Votre paiement de ${amountLabel} a été reçu.`,
            title: 'Paiement bien reçu',
            body: `<p>Bonjour ${escapeEmailHtml(client.name)},</p><p>Votre paiement TWINT de <strong>${escapeEmailHtml(amountLabel)}</strong> pour la facture <strong>${escapeEmailHtml(invoice.number)}</strong> est confirmé.</p>`,
            actionLabel: 'Consulter mes paiements',
            actionUrl: `${siteUrl}/portal#factures`,
          }),
          idempotencyKey: `twint-client-${providerPaymentId}`,
          tags: [{ name: 'category', value: 'payment_receipt' }],
        })
        await logAudit({ organizationId, action: 'invoice.twint_receipt_sent', entityType: 'invoice', entityId: invoiceId, clientId, payload: { email_id: receipt.emailId, payment_id: paymentId } })
      }
      catch (notificationError) {
        console.error('[notification] TWINT receipt failed', notificationError)
        await logAudit({ organizationId, action: 'invoice.twint_receipt_failed', entityType: 'invoice', entityId: invoiceId, clientId, payload: { payment_id: paymentId } })
      }
    }
  }
  return { received: true, duplicate }
})
