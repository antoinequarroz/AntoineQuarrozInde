import { describe, expect, it } from 'vitest'
import { getTwintBalance, getTwintEligibility } from '../server/utils/twint'

const invoice = {
  status: 'sent',
  currency: 'CHF',
  documentType: 'invoice',
  totalCents: 12500,
  paidAmountCents: 2500,
}

describe('TWINT invoice eligibility', () => {
  it('charges only the outstanding balance', () => {
    expect(getTwintBalance(invoice)).toBe(10000)
    expect(getTwintEligibility(invoice)).toEqual({ eligible: true, reason: null })
  })

  it('rejects unsupported or settled documents', () => {
    expect(getTwintEligibility({ ...invoice, currency: 'EUR' }).eligible).toBe(false)
    expect(getTwintEligibility({ ...invoice, documentType: 'credit_note' }).eligible).toBe(false)
    expect(getTwintEligibility({ ...invoice, paidAmountCents: 12500 }).eligible).toBe(false)
    expect(getTwintEligibility({ ...invoice, status: 'cancelled' }).eligible).toBe(false)
  })

  it('stays hidden until Stripe is configured', () => {
    expect(getTwintEligibility(invoice, false)).toEqual({
      eligible: false,
      reason: 'Le paiement TWINT n’est pas encore activé.',
    })
  })
})
