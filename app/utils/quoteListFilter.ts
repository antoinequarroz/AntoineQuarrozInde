import type { Quote } from '../types'

export type QuoteListFilter = 'all' | Quote['status']
const filters: QuoteListFilter[] = ['all', 'draft', 'sent', 'accepted', 'rejected']

export function parseQuoteListFilter(value: unknown): QuoteListFilter {
  return typeof value === 'string' && filters.includes(value as QuoteListFilter) ? value as QuoteListFilter : 'all'
}

/** A sent quote awaits a decision, regardless of its amount or validity date. */
export function isQuoteAwaitingDecision(quote: Pick<Quote, 'status'>): boolean {
  return quote.status === 'sent'
}

export function matchesQuoteListFilter(quote: Pick<Quote, 'status'>, filter: QuoteListFilter): boolean {
  if (filter === 'sent') return isQuoteAwaitingDecision(quote)
  return filter === 'all' || quote.status === filter
}
