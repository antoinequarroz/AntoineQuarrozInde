import type { Invoice } from '../types'

type OutstandingInvoice = Pick<Invoice, 'documentType' | 'status' | 'currency' | 'dueAt' | 'totalCents' | 'amountCents' | 'paidAmountCents'>

/** Outstanding issued invoices, separated by currency. A cutoff includes overdue invoices. */
export function outstandingInvoiceTotals(invoices: OutstandingInvoice[], dueThrough?: string): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const invoice of invoices) {
    if (invoice.documentType !== 'invoice' || !['sent', 'overdue'].includes(invoice.status)) continue
    if (dueThrough && (!invoice.dueAt || invoice.dueAt > dueThrough)) continue
    const outstanding = Math.max(0, (invoice.totalCents ?? invoice.amountCents) - invoice.paidAmountCents)
    if (!outstanding) continue
    const currency = invoice.currency || 'CHF'
    totals[currency] = (totals[currency] || 0) + outstanding
  }
  return totals
}
