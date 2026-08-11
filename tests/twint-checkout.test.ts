import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

type CheckoutState = {
  invoice?: Record<string, unknown> | null
  payments?: Array<{ amount_cents: number, voided_at: string | null }>
  filters: Array<{ table: string, operator: string, column: string, value: unknown }>
}

function httpError(input: { statusCode: number, message: string }) {
  return Object.assign(new Error(input.message), input)
}

function createCheckoutSupabase(state: CheckoutState) {
  return {
    from(table: string) {
      const query = {
        select() { return query },
        eq(column: string, value: unknown) {
          state.filters.push({ table, operator: 'eq', column, value })
          return query
        },
        ilike(column: string, value: unknown) {
          state.filters.push({ table, operator: 'ilike', column, value })
          return query
        },
        neq(column: string, value: unknown) {
          state.filters.push({ table, operator: 'neq', column, value })
          return query
        },
        lte(column: string, value: unknown) {
          state.filters.push({ table, operator: 'lte', column, value })
          return query
        },
        gt(column: string, value: unknown) {
          state.filters.push({ table, operator: 'gt', column, value })
          return query
        },
        update() { return query },
        insert() { return query },
        maybeSingle() {
          if (table === 'invoices') return Promise.resolve({ data: state.invoice ?? null, error: null })
          return Promise.resolve({ data: null, error: null })
        },
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          const value = table === 'invoice_payments'
            ? { data: state.payments || [], error: null }
            : { data: null, error: null }
          return Promise.resolve(value).then(resolve, reject)
        },
      }
      return query
    },
  }
}

describe('TWINT Checkout session', () => {
  let handler: (event: { context: Record<string, unknown> }) => Promise<{ url: string }>
  let body: Record<string, unknown>
  let state: CheckoutState
  let createSession: ReturnType<typeof vi.fn>
  let audit: ReturnType<typeof vi.fn>

  beforeAll(async () => {
    vi.stubGlobal('defineEventHandler', (value: unknown) => value)
    handler = (await import('../server/api/portal/twint-checkout.post')).default as typeof handler
  })

  beforeEach(() => {
    body = { invoiceId: 42 }
    state = {
      invoice: {
        id: 42,
        number: 'FAC-2026-0042',
        client_id: 7,
        total_cents: 10_000,
        amount_cents: 10_000,
        currency: 'CHF',
        status: 'sent',
        document_type: 'invoice',
      },
      payments: [{ amount_cents: 2_500, voided_at: null }],
      filters: [],
    }
    createSession = vi.fn().mockResolvedValue({
      id: 'cs_test_twint',
      url: 'https://checkout.stripe.test/cs_test_twint',
      expires_at: 1_786_035_600,
    })
    audit = vi.fn().mockResolvedValue(undefined)

    vi.stubGlobal('requirePortalClient', () => Promise.resolve({
      org: { id: 'org-test' },
      user: { id: 'user-test', email: 'client@example.ch' },
      client: { id: 7, name: 'Client Test', email: 'client@example.ch' },
    }))
    vi.stubGlobal('readBody', () => Promise.resolve(body))
    vi.stubGlobal('createError', httpError)
    vi.stubGlobal('useRuntimeConfig', () => ({
      stripeSecretKey: 'sk_test_example',
      stripeWebhookSecret: 'whsec_test_example',
      public: { siteUrl: 'https://www.antoinequarroz.ch/' },
    }))
    vi.stubGlobal('getSupabaseAdmin', () => createCheckoutSupabase(state))
    vi.stubGlobal('getStripeClient', () => ({ checkout: { sessions: { create: createSession } } }))
    vi.stubGlobal('logAudit', audit)
  })

  const event = () => ({ context: { user: { id: 'user-test', email: 'client@example.ch' } } })

  it('charges only the outstanding CHF balance through TWINT', async () => {
    await expect(handler(event())).resolves.toEqual({
      url: 'https://checkout.stripe.test/cs_test_twint',
      sessionId: 'cs_test_twint',
      reused: false,
    })

    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      payment_method_types: ['twint'],
      customer_email: 'client@example.ch',
      client_reference_id: '42',
      success_url: 'https://www.antoinequarroz.ch/portal?payment=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.antoinequarroz.ch/portal?payment=cancelled',
      metadata: {
        organization_id: 'org-test',
        invoice_id: '42',
        client_id: '7',
        invoice_number: 'FAC-2026-0042',
      },
    }))
    expect(createSession.mock.calls[0]?.[0].line_items[0].price_data).toMatchObject({
      currency: 'chf',
      unit_amount: 7_500,
    })
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'invoice.twint_checkout_created',
      entityId: 42,
      clientId: 7,
    }))
  })

  it('scopes the invoice lookup to the organization and authenticated client', async () => {
    await handler(event())

    expect(state.filters).toEqual(expect.arrayContaining([
      { table: 'invoices', operator: 'eq', column: 'organization_id', value: 'org-test' },
      { table: 'invoices', operator: 'eq', column: 'client_id', value: 7 },
      { table: 'invoices', operator: 'eq', column: 'id', value: 42 },
      { table: 'invoices', operator: 'neq', column: 'status', value: 'draft' },
    ]))
  })

  it('rejects invalid, cancelled and non-CHF invoices before calling Stripe', async () => {
    body = { invoiceId: 'not-an-id' }
    await expect(handler(event())).rejects.toMatchObject({ statusCode: 400 })

    body = { invoiceId: 42 }
    state.invoice = { ...state.invoice, status: 'cancelled' }
    await expect(handler(event())).rejects.toMatchObject({ statusCode: 409 })

    state.invoice = { ...state.invoice, status: 'sent', currency: 'EUR' }
    await expect(handler(event())).rejects.toMatchObject({ statusCode: 409 })
    expect(createSession).not.toHaveBeenCalled()
  })

  it('fails safely when Stripe does not return a Checkout URL', async () => {
    createSession.mockResolvedValue({ id: 'cs_test_twint', url: null, expires_at: 1_786_035_600 })

    await expect(handler(event())).rejects.toMatchObject({ statusCode: 502 })
    expect(audit).not.toHaveBeenCalled()
  })
})
