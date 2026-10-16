import type { Invoice } from '../types'
import { isOutstandingInvoice, isPlannedInvoice } from './outstandingInvoices'

export type InvoiceListFilter = 'all' | Invoice['status'] | 'outstanding' | 'draft-invoices'
const filters: InvoiceListFilter[] = ['all', 'draft', 'sent', 'overdue', 'paid', 'cancelled', 'outstanding', 'draft-invoices']

export function parseInvoiceListFilter(value: unknown): InvoiceListFilter {
  return typeof value === 'string' && filters.includes(value as InvoiceListFilter) ? value as InvoiceListFilter : 'all'
}

export function matchesInvoiceListFilter(invoice: Invoice, filter: InvoiceListFilter): boolean {
  if (filter === 'outstanding') return isOutstandingInvoice(invoice)
  if (filter === 'draft-invoices') return isPlannedInvoice(invoice)
  return filter === 'all' || invoice.status === filter || (filter === 'sent' && invoice.status === 'overdue')
}
