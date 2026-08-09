import { describe, expect, it } from 'vitest'
import { hasLockedInvoiceContentMutation, isInvoiceLocked } from '../server/utils/invoiceLock'

describe('invoice accounting lock', () => {
  it('locks every document that left draft state', () => {
    expect(isInvoiceLocked({ status: 'draft', locked_at: null })).toBe(false)
    expect(isInvoiceLocked({ status: 'sent', locked_at: null })).toBe(true)
    expect(isInvoiceLocked({ status: 'draft', locked_at: '2026-08-06T08:00:00Z' })).toBe(true)
  })

  it('allows lifecycle notes but rejects accounting content changes', () => {
    expect(hasLockedInvoiceContentMutation({ status: 'paid', notes: 'Règlement reçu' })).toBe(false)
    expect(hasLockedInvoiceContentMutation({ number: 'FAC-NEW' })).toBe(true)
    expect(hasLockedInvoiceContentMutation({ items: [] })).toBe(true)
  })
})
