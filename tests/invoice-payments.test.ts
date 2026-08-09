import { describe, expect, it } from 'vitest'
import { invoiceStatusFromPayments, normalizeInvoicePayment } from '../server/utils/invoicePayments'

describe('invoice payments', () => {
  it('normalizes a valid payment', () => {
    expect(normalizeInvoicePayment({ amountCents: 12500, method: 'twint', paidAt: '2026-08-06' })).toMatchObject({
      amountCents: 12500,
      method: 'twint',
      paidAt: '2026-08-06',
    })
  })

  it('rejects invalid amounts and methods', () => {
    expect(() => normalizeInvoicePayment({ amountCents: 0 })).toThrow(/supérieur à zéro/)
    expect(() => normalizeInvoicePayment({ amountCents: 100, method: 'card' })).toThrow(/invalide/)
  })

  it('derives paid, overdue and sent states from the balance', () => {
    expect(invoiceStatusFromPayments({ totalCents: 1000, paidAmountCents: 1000 })).toBe('paid')
    expect(invoiceStatusFromPayments({ totalCents: 1000, paidAmountCents: 500, dueAt: '2026-08-01', today: '2026-08-06' })).toBe('overdue')
    expect(invoiceStatusFromPayments({ totalCents: 1000, paidAmountCents: 500, dueAt: '2026-08-20', today: '2026-08-06' })).toBe('sent')
  })
})
