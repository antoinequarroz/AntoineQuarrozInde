import { describe, expect, it } from 'vitest'
import type { Quote } from '../app/types'
import { isQuoteAwaitingDecision, matchesQuoteListFilter, parseQuoteListFilter } from '../app/utils/quoteListFilter'

const quote = (id: number, overrides: Partial<Quote> = {}): Quote => ({
  id, number: `QUOTE-${id}`, clientId: null, projectId: null, title: 'Projet de démonstration',
  amountCents: 50000, currency: 'CHF', status: 'sent', issuedAt: '2026-10-01',
  validUntil: null, notes: null, createdAt: '2026-10-01', ...overrides,
})

describe('Quote dashboard filters', () => {
  it('shows exactly the sent quotes awaiting a decision, regardless of their validity date', () => {
    const documents = [
      quote(1, { status: 'draft' }),
      quote(2, { validUntil: '2026-09-01' }),
      quote(3, { validUntil: '2026-10-16' }),
      quote(4, { validUntil: '2099-12-31' }),
      quote(5, { validUntil: null }),
      quote(6, { status: 'accepted' }),
      quote(7, { status: 'rejected' }),
    ]
    const visible = documents.filter(item => matchesQuoteListFilter(item, 'sent'))
    expect(visible.map(item => item.id)).toEqual([2, 3, 4, 5])
    expect(visible).toEqual(documents.filter(isQuoteAwaitingDecision))
  })

  it('keeps a zero-value sent quote awaiting a decision and preserves its document fields', () => {
    const document = quote(1, { amountCents: 0, totalCents: 0, validUntil: '2026-09-01' })
    const before = { ...document }
    expect(isQuoteAwaitingDecision(document)).toBe(true)
    expect(matchesQuoteListFilter(document, 'sent')).toBe(true)
    expect(document).toEqual(before)
  })

  it('preserves the other status filters and allows every document when reset', () => {
    const documents = [quote(1, { status: 'draft' }), quote(2), quote(3, { status: 'accepted' }), quote(4, { status: 'rejected' })]
    for (const status of ['draft', 'sent', 'accepted', 'rejected'] as const) {
      expect(documents.filter(item => matchesQuoteListFilter(item, status))).toEqual(documents.filter(item => item.status === status))
    }
    expect(documents.filter(item => matchesQuoteListFilter(item, 'all'))).toEqual(documents)
  })

  it('accepts known URL statuses and resets invalid or repeated parameters safely', () => {
    for (const status of ['all', 'draft', 'sent', 'accepted', 'rejected'] as const) {
      expect(parseQuoteListFilter(status)).toBe(status)
    }
    for (const value of [undefined, null, '', 'expired', 'unknown', ['sent'], ['sent', 'draft']]) {
      expect(parseQuoteListFilter(value)).toBe('all')
    }
  })
})
