import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

type WebhookEvent = {
  type: string
  created: number
  data: { object: Record<string, unknown> }
}

type DatabaseState = {
  existingPayment?: { id: number } | null
  invoice?: Record<string, unknown> | null
  payments?: Array<{ amount_cents: number, voided_at: string | null }>
  insertedPayment?: Record<string, unknown>
  updatedInvoice?: Record<string, unknown>
}

function httpError(input: { statusCode: number, message: string }) {
  return Object.assign(new Error(input.message), input)
}

function createSupabaseStub(state: DatabaseState) {
  const calls = new Map<string, number>()

  return {
    from(table: string) {
      const call = (calls.get(table) || 0) + 1
      calls.set(table, call)
      let operation = 'select'

      const result = () => {
        if (table === 'invoice_payments' && call === 3) return { data: state.payments || [], error: null }
        return { data: null, error: null }
      }
      const query = {
        select() { return query },
        eq() { return query },
        insert(payload: Record<string, unknown>) {
          operation = 'insert'
          state.insertedPayment = payload
          return query
        },
        update(payload: Record<string, unknown>) {
          operation = 'update'
          state.updatedInvoice = payload
          return query
        },
        maybeSingle() {
          if (table === 'invoice_payments') return Promise.resolve({ data: state.existingPayment ?? null, error: null })
          if (table === 'invoices') return Promise.resolve({ data: state.invoice ?? null, error: null })
          return Promise.resolve({ data: null, error: null })
        },
        single() {
          if (operation === 'insert') return Promise.resolve({ data: { id: 91 }, error: null })
          return Promise.resolve(result())
        },
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve(result()).then(resolve, reject)
        },
      }
      return query
    },
  }
}

function paidCheckoutEvent(overrides: Record<string, unknown> = {}): WebhookEvent {
  return {
    type: 'checkout.session.completed',
    created: 1_786_035_600,
    data: {
      object: {
        id: 'cs_test_twint',
        payment_status: 'paid',
        payment_intent: 'pi_test_twint',
        amount_total: 10_000,
        metadata: {
          organization_id: 'org-test',
          invoice_id: '42',
          client_id: '7',
        },
        ...overrides,
      },
    },
  }
}

describe('Stripe TWINT webhook', () => {
  let handler: (event: unknown) => Promise<Record<string, unknown>>
  let stripeEvent: WebhookEvent
  let constructEvent: ReturnType<typeof vi.fn>
  let audit: ReturnType<typeof vi.fn>

  beforeAll(async () => {
    vi.stubGlobal('defineEventHandler', (value: unknown) => value)
    handler = (await import('../server/api/webhooks/stripe.post')).default as typeof handler
  })

  beforeEach(() => {
    stripeEvent = paidCheckoutEvent()
    constructEvent = vi.fn(() => stripeEvent)
    audit = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('useRuntimeConfig', () => ({ stripeWebhookSecret: 'whsec_test' }))
    vi.stubGlobal('createError', httpError)
    vi.stubGlobal('getHeader', () => 'stripe-signature-test')
    vi.stubGlobal('readRawBody', () => Promise.resolve('{"id":"evt_test"}'))
    vi.stubGlobal('getStripeClient', () => ({ webhooks: { constructEvent } }))
    vi.stubGlobal('logAudit', audit)
  })

  it('rejects an invalid Stripe signature before touching the database', async () => {
    constructEvent.mockImplementation(() => { throw new Error('invalid signature') })
    const getSupabaseAdmin = vi.fn()
    vi.stubGlobal('getSupabaseAdmin', getSupabaseAdmin)

    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(constructEvent).toHaveBeenCalledWith('{"id":"evt_test"}', 'stripe-signature-test', 'whsec_test')
    expect(getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('ignores unrelated and unpaid events', async () => {
    const getSupabaseAdmin = vi.fn()
    vi.stubGlobal('getSupabaseAdmin', getSupabaseAdmin)

    stripeEvent = { type: 'payment_intent.created', created: 1, data: { object: {} } }
    await expect(handler({})).resolves.toEqual({ received: true })

    stripeEvent = paidCheckoutEvent({ payment_status: 'unpaid' })
    await expect(handler({})).resolves.toEqual({ received: true })
    expect(getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('is idempotent when Stripe retries the same payment', async () => {
    const state: DatabaseState = { existingPayment: { id: 12 } }
    vi.stubGlobal('getSupabaseAdmin', () => createSupabaseStub(state))

    await expect(handler({})).resolves.toEqual({ received: true, duplicate: true })
    expect(state.insertedPayment).toBeUndefined()
    expect(audit).not.toHaveBeenCalled()
  })

  it('records a paid TWINT checkout and closes the invoice', async () => {
    const state: DatabaseState = {
      existingPayment: null,
      invoice: {
        id: 42,
        total_cents: 10_000,
        amount_cents: 10_000,
        due_at: '2026-08-31',
        status: 'sent',
        currency: 'CHF',
        client_id: 7,
      },
      payments: [{ amount_cents: 10_000, voided_at: null }],
    }
    vi.stubGlobal('getSupabaseAdmin', () => createSupabaseStub(state))

    await expect(handler({})).resolves.toEqual({ received: true })
    expect(state.insertedPayment).toMatchObject({
      organization_id: 'org-test',
      invoice_id: 42,
      amount_cents: 10_000,
      currency: 'CHF',
      method: 'twint',
      provider: 'stripe',
      provider_payment_id: 'pi_test_twint',
    })
    expect(state.updatedInvoice).toMatchObject({ status: 'paid' })
    expect(state.updatedInvoice?.paid_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-test',
      action: 'invoice.twint_payment_confirmed',
      entityId: 42,
    }))
  })

  it('rejects incomplete payment metadata', async () => {
    stripeEvent = paidCheckoutEvent({ metadata: { invoice_id: '42' } })
    vi.stubGlobal('getSupabaseAdmin', vi.fn())

    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
  })
})
