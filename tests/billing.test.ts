import { describe, expect, it } from 'vitest'
import { computeTotals, normalizeBillingItems } from '../server/utils/billing'

describe('facturation V2', () => {
  it('normalise les lignes et calcule les montants CHF avec TVA', () => {
    const items = normalizeBillingItems([
      { label: 'Conception', quantity: 2, unitPriceCents: 12_500, taxRate: 8.1 },
      { label: 'Hébergement', quantity: 1, unitPriceCents: 2_000, taxRate: 0 },
    ])

    expect(items).toHaveLength(2)
    expect(items[0]?.total_cents).toBe(27_025)
    expect(computeTotals(items)).toEqual({
      subtotalCents: 27_000,
      taxCents: 2_025,
      totalCents: 29_025,
    })
  })

  it('écarte les lignes sans libellé et sécurise les valeurs invalides', () => {
    const items = normalizeBillingItems([
      { label: '', quantity: 1, unitPriceCents: 500, taxRate: 8.1 },
      { label: 'Audit', quantity: -4, unitPriceCents: 1_000, taxRate: -2 },
    ])

    expect(items).toEqual([
      {
        position: 1,
        label: 'Audit',
        description: null,
        quantity: 1,
        unit_price_cents: 1_000,
        tax_rate: 0,
        total_cents: 1_000,
      },
    ])
    expect(computeTotals(items)).toEqual({ subtotalCents: 1_000, taxCents: 0, totalCents: 1_000 })
  })
})
