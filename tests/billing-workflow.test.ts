import { describe, expect, it } from 'vitest'
import { addDaysIso, nextBillingNumber, paymentTermsFromNotes } from '../server/utils/billingWorkflow'

describe('billing workflow', () => {
  it('generates the next yearly quote and invoice numbers', () => {
    const date = new Date('2026-08-05T12:00:00.000Z')
    expect(nextBillingNumber('quote', ['DEV-2026-0002', 'DEV-2025-0099'], date)).toBe('DEV-2026-0003')
    expect(nextBillingNumber('invoice', ['FAC-2026-0010', 'legacy-12'], date)).toBe('FAC-2026-0011')
  })

  it('handles due dates and payment terms', () => {
    expect(addDaysIso('2026-08-05', 30)).toBe('2026-09-04')
    expect(paymentTermsFromNotes('Paiement: 45 jours')).toBe(45)
    expect(paymentTermsFromNotes('aucune condition')).toBe(30)
  })
})
