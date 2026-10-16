import { describe, expect, it } from 'vitest'
import type { Invoice } from '../app/types'
import { matchesInvoiceListFilter, parseInvoiceListFilter } from '../app/utils/invoiceListFilter'
import { outstandingInvoiceTotals, draftInvoiceTotals } from '../app/utils/outstandingInvoices'

const invoice = (id: number, overrides: Partial<Invoice> = {}): Invoice => ({
  id, number: `INV-${id}`, clientId: null, quoteId: null, projectId: null, amountCents: 50000,
  currency: 'CHF', status: 'sent', issuedAt: null, dueAt: null, paidAt: null, notes: null,
  documentType: 'invoice', creditedInvoiceId: null, lockedAt: null, paymentReferenceType: 'NON',
  paymentReference: null, paidAmountCents: 0, createdAt: '', ...overrides,
})

describe('Invoice dashboard filters', () => {
  it('opens exactly the documents contributing to each dashboard amount', () => {
    const documents = [invoice(1), invoice(2, { status: 'draft' }), invoice(3, { status: 'overdue', paidAmountCents: 20000 }),
      invoice(4, { paidAmountCents: 50000 }), invoice(5, { status: 'paid' }), invoice(6, { status: 'cancelled' }),
      invoice(7, { documentType: 'credit_note' }), invoice(8, { status: 'draft', documentType: 'credit_note' }),
      invoice(9, { status: 'draft', amountCents: 0 })]
    const outstanding = documents.filter(item => matchesInvoiceListFilter(item, 'outstanding'))
    const planned = documents.filter(item => matchesInvoiceListFilter(item, 'draft-invoices'))
    expect(outstanding.map(item => item.id)).toEqual([1, 3])
    expect(planned.map(item => item.id)).toEqual([2])
    expect(outstandingInvoiceTotals(outstanding)).toEqual(outstandingInvoiceTotals(documents))
    expect(draftInvoiceTotals(planned)).toEqual(draftInvoiceTotals(documents))
  })
  it('preserves existing general status filters, including draft credit notes', () => {
    expect(matchesInvoiceListFilter(invoice(1, { status: 'overdue' }), 'sent')).toBe(true)
    expect(matchesInvoiceListFilter(invoice(2, { status: 'draft', documentType: 'credit_note' }), 'draft')).toBe(true)
    expect(matchesInvoiceListFilter(invoice(3), 'paid')).toBe(false)
    expect(matchesInvoiceListFilter(invoice(4), 'all')).toBe(true)
  })
  it('accepts named URL filters and resets invalid or repeated parameters safely', () => {
    expect(parseInvoiceListFilter('outstanding')).toBe('outstanding')
    expect(parseInvoiceListFilter('draft-invoices')).toBe('draft-invoices')
    for (const value of [undefined, null, '', 'unknown', ['draft', 'paid']]) expect(parseInvoiceListFilter(value)).toBe('all')
  })
})
