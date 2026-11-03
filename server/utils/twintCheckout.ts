import type Stripe from 'stripe'

type TwintCheckoutInput = {
  amountCents: number
  siteUrl: string
  organizationId: string
  invoice: { id: number, number: string }
  client: { id: number, email?: string | null }
  userEmail: string
}

export function buildTwintCheckoutParams(input: TwintCheckoutInput): Stripe.Checkout.SessionCreateParams {
  return {
    mode: 'payment',
    // The account enables Managed Payments by default. This invoice checkout
    // must opt out so Stripe offers TWINT only and does not recalculate tax
    // already included in the invoice total.
    managed_payments: { enabled: false },
    // Since API 2026-09-30 (stripe-node 23), Checkout no longer accepts
    // payment_method_types. This filter keeps TWINT as the only option, as long
    // as TWINT stays enabled in the Stripe payment method settings.
    allowed_payment_method_types: ['twint'],
    customer_email: input.client.email || input.userEmail,
    client_reference_id: String(input.invoice.id),
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'chf',
        unit_amount: input.amountCents,
        product_data: { name: `Facture ${input.invoice.number}` },
      },
    }],
    metadata: {
      organization_id: input.organizationId,
      invoice_id: String(input.invoice.id),
      client_id: String(input.client.id),
      invoice_number: input.invoice.number,
    },
    success_url: `${input.siteUrl}/portal?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.siteUrl}/portal?payment=cancelled`,
  }
}
