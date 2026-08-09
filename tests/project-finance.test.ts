import { describe, expect, it } from 'vitest'
import { computeProjectFinance, projectFinancialPayload } from '../server/utils/projectFinance'

describe('project profitability', () => {
  it('computes tracked cost and margins in cents', () => {
    expect(computeProjectFinance({
      budgetCents: 500_000,
      internalHourlyCostCents: 8_000,
      trackedMinutes: 600,
      quotedCents: 540_000,
      invoicedCents: 300_000,
      collectedCents: 200_000,
    })).toMatchObject({
      trackedCostCents: 80_000,
      forecastMarginCents: 420_000,
      actualMarginCents: 120_000,
      budgetConsumedPercent: 16,
    })
  })

  it('rejects negative financial settings', () => {
    expect(() => projectFinancialPayload({ budgetCents: -1, internalHourlyCostCents: 8_000 })).toThrow()
  })
})
