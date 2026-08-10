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
    // must opt out so Stripe accepts an explicit TWINT-only payment method and
    // does not recalculate tax already included in the invoice total.
    managed_payments: { enabled: false },
    payment_method_types: ['twint'],
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
