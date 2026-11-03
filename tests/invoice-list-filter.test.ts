import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Invoice } from '../app/types'
import { matchesInvoiceListFilter, parseInvoiceListFilter } from '../app/utils/invoiceListFilter'
import { outstandingInvoiceTotals, draftInvoiceTotals, invoiceThirtyDayCutoff } from '../app/utils/outstandingInvoices'

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
    expect(parseInvoiceListFilter('outstanding-30-days')).toBe('outstanding-30-days')
    expect(parseInvoiceListFilter('draft-invoices')).toBe('draft-invoices')
    for (const value of [undefined, null, '', 'unknown', ['draft', 'paid']]) expect(parseInvoiceListFilter(value)).toBe('all')
  })
})

describe('30-day receivables', () => {
  afterEach(() => vi.useRealTimers())

  it('matches the dashboard amount at J+30 inclusive, with overdue and partial payments', () => {
    const documents = [
      invoice(1, { dueAt: '2026-11-15' }),
      invoice(2, { dueAt: '2026-11-16' }),
      invoice(3, { dueAt: '2026-09-01', status: 'overdue', paidAmountCents: 20000 }),
      invoice(4, { dueAt: null }),
      invoice(5, { dueAt: '2026-11-15', paidAmountCents: 50000 }),
      invoice(6, { dueAt: '2026-11-15', documentType: 'credit_note' }),
      invoice(7, { dueAt: '2026-11-15', status: 'draft' }),
      invoice(8, { dueAt: '2026-11-15', status: 'paid' }),
      invoice(9, { dueAt: '2026-11-15', status: 'cancelled' }),
    ]
    const cutoff = invoiceThirtyDayCutoff('2026-10-16')
    expect(cutoff).toBe('2026-11-15')
    const visible = documents.filter(item => matchesInvoiceListFilter(item, 'outstanding-30-days', cutoff))
    expect(visible.map(item => item.id)).toEqual([1, 3])
    expect(outstandingInvoiceTotals(visible, cutoff)).toEqual({ CHF: 80000 })
    expect(outstandingInvoiceTotals(documents, cutoff)).toEqual(outstandingInvoiceTotals(visible, cutoff))
  })

  it('uses the Zurich date around UTC midnight and the daylight-saving transition', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T22:30:00Z'))
    expect(invoiceThirtyDayCutoff()).toBe('2026-11-15')
    expect(matchesInvoiceListFilter(invoice(1, { dueAt: '2026-11-16' }), 'outstanding-30-days')).toBe(false)
    vi.setSystemTime(new Date('2026-10-16T22:30:00Z'))
    expect(invoiceThirtyDayCutoff()).toBe('2026-11-16')
    expect(matchesInvoiceListFilter(invoice(1, { dueAt: '2026-11-16' }), 'outstanding-30-days')).toBe(true)
    expect(invoiceThirtyDayCutoff('2026-12-15')).toBe('2027-01-14')
    expect(invoiceThirtyDayCutoff('2028-02-01')).toBe('2028-03-02')
  })
})
