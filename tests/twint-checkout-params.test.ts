import { describe, expect, it } from 'vitest'
import { buildTwintCheckoutParams } from '../server/utils/twintCheckout'

describe('TWINT Checkout parameters', () => {
  it('opts out of Managed Payments and keeps the checkout TWINT-only', () => {
    const params = buildTwintCheckoutParams({
      amountCents: 10_810,
      siteUrl: 'https://www.antoinequarroz.ch',
      organizationId: 'org-test',
      invoice: { id: 123, number: 'FAC-2026-0014' },
      client: { id: 120, email: 'client@example.ch' },
      userEmail: 'fallback@example.ch',
    })

    expect(params).toMatchObject({
      mode: 'payment',
      managed_payments: { enabled: false },
      payment_method_types: ['twint'],
      customer_email: 'client@example.ch',
      client_reference_id: '123',
      success_url: 'https://www.antoinequarroz.ch/portal?payment=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.antoinequarroz.ch/portal?payment=cancelled',
      metadata: {
        organization_id: 'org-test',
        invoice_id: '123',
        client_id: '120',
        invoice_number: 'FAC-2026-0014',
      },
    })
    expect(params.line_items?.[0]).toMatchObject({
      quantity: 1,
      price_data: { currency: 'chf', unit_amount: 10_810 },
    })
  })
})
