import { describe, expect, it } from 'vitest'
import { getTwintBalance, getTwintEligibility, isTwintConfigured, TWINT_MAX_AMOUNT_CENTS } from '../server/utils/twint'

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

  it('enforces the official CHF 5,000 single-payment ceiling', () => {
    expect(getTwintEligibility({ ...invoice, totalCents: TWINT_MAX_AMOUNT_CENTS, paidAmountCents: 0 }).eligible).toBe(true)
    expect(getTwintEligibility({ ...invoice, totalCents: TWINT_MAX_AMOUNT_CENTS + 1, paidAmountCents: 0 })).toEqual({
      eligible: false,
      reason: 'TWINT accepte au maximum 5’000 CHF par paiement.',
    })
  })

  it('requires both the Stripe API and webhook secrets', () => {
    expect(isTwintConfigured({ stripeSecretKey: 'sk_test', stripeWebhookSecret: 'whsec_test' })).toBe(true)
    expect(isTwintConfigured({ stripeSecretKey: 'sk_test' })).toBe(false)
    expect(isTwintConfigured({ stripeWebhookSecret: 'whsec_test' })).toBe(false)
  })
})
