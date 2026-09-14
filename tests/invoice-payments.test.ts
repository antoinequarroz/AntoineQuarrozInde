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

  it('rejects impossible dates and unbounded text fields', () => {
    expect(() => normalizeInvoicePayment({ amountCents: 100, paidAt: '2026-02-31' })).toThrow(/Date de paiement invalide/)
    expect(() => normalizeInvoicePayment({ amountCents: 100, paidAt: '31.08.2026' })).toThrow(/Date de paiement invalide/)
    expect(() => normalizeInvoicePayment({ amountCents: 100, reference: 'x'.repeat(161) })).toThrow(/référence.*trop longue/i)
    expect(() => normalizeInvoicePayment({ amountCents: 100, notes: 'x'.repeat(1001) })).toThrow(/note.*trop longue/i)
  })

  it('derives paid, overdue and sent states from the balance', () => {
    expect(invoiceStatusFromPayments({ totalCents: 1000, paidAmountCents: 1000 })).toBe('paid')
    expect(invoiceStatusFromPayments({ totalCents: 1000, paidAmountCents: 500, dueAt: '2026-08-01', today: '2026-08-06' })).toBe('overdue')
    expect(invoiceStatusFromPayments({ totalCents: 1000, paidAmountCents: 500, dueAt: '2026-08-20', today: '2026-08-06' })).toBe('sent')
  })
})
