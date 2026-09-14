import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('payment observability API', () => {
  const recordInvoicePayment = vi.fn()
  const recordCommercialWorkflowEvent = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    recordInvoicePayment.mockReset()
    recordCommercialWorkflowEvent.mockReset()
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('resolveCommercialCorrelationId', vi.fn().mockReturnValue('0199c7a3-1b7d-7000-8000-123456789abc'))
    vi.stubGlobal('requireAdmin', vi.fn().mockResolvedValue({ org: { id: 'org-1' }, user: { id: 'user-1' } }))
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({
      invoiceId: 42,
      confirmation: 'ENREGISTRER_PAIEMENT',
      idempotencyKey: 'payment-submit-1234',
      amountCents: 1000,
      method: 'bank_transfer',
      paidAt: '2026-09-14',
    }))
    vi.stubGlobal('recordCommercialWorkflowEvent', recordCommercialWorkflowEvent)
    vi.stubGlobal('createError', (input: object) => Object.assign(new Error('request failed'), input))
    vi.doMock('../server/utils/recordInvoicePayment', () => ({ recordInvoicePayment }))
  })

  it.each([
    [{ created: true, payment: { id: 9 } }, 'success'],
    [{ created: false, payment: { id: 9 } }, 'recovered'],
  ] as const)('records %s as %s without changing the payment result', async (result, outcome) => {
    recordInvoicePayment.mockResolvedValue(result)
    const { default: handler } = await import('../server/api/invoices/payments.post')
    await expect(handler({ context: {} } as never)).resolves.toEqual(result)
    expect(recordCommercialWorkflowEvent).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-1',
      stage: 'payment',
      outcome,
      entityId: 9,
    }))
  })

  it('records a closed failure code and preserves the public error', async () => {
    const providerError = Object.assign(new Error('provider secret'), { statusCode: 500 })
    recordInvoicePayment.mockRejectedValue(providerError)
    const { default: handler } = await import('../server/api/invoices/payments.post')
    await expect(handler({ context: {} } as never)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Le paiement n’a pas pu être enregistré.',
    })
    expect(recordCommercialWorkflowEvent).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'payment',
      outcome: 'failure',
      code: 'payment_record_failed',
    }))
  })
})
