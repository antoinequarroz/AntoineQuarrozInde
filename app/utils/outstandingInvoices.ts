import type { Invoice } from '../types'

type OutstandingInvoice = Pick<Invoice, 'documentType' | 'status' | 'currency' | 'dueAt' | 'totalCents' | 'amountCents' | 'paidAmountCents'>

export function isOutstandingInvoice(invoice: OutstandingInvoice, dueThrough?: string): boolean {
  return invoice.documentType === 'invoice' && ['sent', 'overdue'].includes(invoice.status)
    && (invoice.totalCents ?? invoice.amountCents) - invoice.paidAmountCents > 0
    && (!dueThrough || Boolean(invoice.dueAt && invoice.dueAt <= dueThrough))
}

/** Calendar days from the Swiss business date, unaffected by daylight-saving changes. */
export function invoiceThirtyDayCutoff(todayIso = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())): string {
  const [year, month, day] = todayIso.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day!))
  date.setUTCDate(date.getUTCDate() + 30)
  return date.toISOString().slice(0, 10)
}

export function isPlannedInvoice(invoice: OutstandingInvoice): boolean {
  return invoice.documentType === 'invoice' && invoice.status === 'draft'
    && (invoice.totalCents ?? invoice.amountCents) > 0
}

/** Outstanding issued invoices, separated by currency. A cutoff includes overdue invoices. */
export function outstandingInvoiceTotals(invoices: OutstandingInvoice[], dueThrough?: string): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const invoice of invoices) {
    if (!isOutstandingInvoice(invoice, dueThrough)) continue
    const outstanding = Math.max(0, (invoice.totalCents ?? invoice.amountCents) - invoice.paidAmountCents)
    if (!outstanding) continue
    const currency = invoice.currency || 'CHF'
    totals[currency] = (totals[currency] || 0) + outstanding
  }
  return totals
}

/** Planned, unissued invoice amounts; these are not receivables. */
export function draftInvoiceTotals(invoices: OutstandingInvoice[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const invoice of invoices) {
    if (!isPlannedInvoice(invoice)) continue
    const amount = Math.max(0, invoice.totalCents ?? invoice.amountCents)
    if (!amount) continue
    const currency = invoice.currency || 'CHF'
    totals[currency] = (totals[currency] || 0) + amount
  }
  return totals
}
