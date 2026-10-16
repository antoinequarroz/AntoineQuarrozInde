import { describe, expect, it } from 'vitest'
import { outstandingInvoiceTotals } from '../app/utils/outstandingInvoices'

const invoice = (overrides: Partial<Parameters<typeof outstandingInvoiceTotals>[0][number]> = {}) => ({
  documentType: 'invoice' as const, status: 'sent' as const, currency: 'CHF',
  dueAt: '2026-11-16', amountCents: 50000, paidAmountCents: 0, ...overrides,
})

describe('Outstanding invoice totals', () => {
  it('shows an issued deposit immediately, while keeping the 30-day window separate', () => {
    const documents = [invoice(), invoice({ status: 'draft', dueAt: null })]
    expect(outstandingInvoiceTotals(documents)).toEqual({ CHF: 50000 })
    expect(outstandingInvoiceTotals(documents, '2026-11-15')).toEqual({})
    expect(outstandingInvoiceTotals(documents, '2026-11-16')).toEqual({ CHF: 50000 })
  })
  it('includes overdue and undated issued balances globally, and only dated balances in the forecast', () => {
    const documents = [invoice({ status: 'overdue', dueAt: '2026-09-01', paidAmountCents: 10000 }), invoice({ dueAt: null })]
    expect(outstandingInvoiceTotals(documents)).toEqual({ CHF: 90000 })
    expect(outstandingInvoiceTotals(documents, '2026-11-15')).toEqual({ CHF: 40000 })
  })
  it('excludes drafts, paid/cancelled invoices, credit notes and non-positive balances', () => {
    const documents = [invoice({ status: 'draft' }), invoice({ status: 'paid' }), invoice({ status: 'cancelled' }),
      invoice({ documentType: 'credit_note' }), invoice({ paidAmountCents: 50000 }), invoice({ paidAmountCents: 60000 })]
    expect(outstandingInvoiceTotals(documents)).toEqual({})
  })
  it('deducts active payments from the final total and keeps currencies separate', () => {
    expect(outstandingInvoiceTotals([
      invoice({ amountCents: 45000, totalCents: 50000, paidAmountCents: 15000 }),
      invoice({ currency: 'EUR', amountCents: 20000 }), invoice({ currency: '', amountCents: 10000 }),
    ])).toEqual({ CHF: 45000, EUR: 20000 })
  })
})
