export type ProjectFinanceInput = {
  budgetCents: number
  internalHourlyCostCents: number
  trackedMinutes: number
  quotedCents: number
  invoicedCents: number
  collectedCents: number
}

function nonNegativeInteger(value: unknown, field: string) {
  const amount = Number(value ?? 0)
  if (!Number.isInteger(amount) || amount < 0 || amount > 1_000_000_000) {
    throw createError({ statusCode: 400, message: `${field} est invalide.` })
  }
  return amount
}

export function projectFinancialPayload(body: Record<string, unknown>) {
  return {
    budget_cents: nonNegativeInteger(body.budgetCents, 'Le budget'),
    internal_hourly_cost_cents: nonNegativeInteger(body.internalHourlyCostCents, 'Le coût horaire interne'),
  }
}

export function computeProjectFinance(input: ProjectFinanceInput) {
  const trackedCostCents = Math.round((input.trackedMinutes / 60) * input.internalHourlyCostCents)
  const forecastMarginCents = input.budgetCents - trackedCostCents
  const actualMarginCents = input.collectedCents - trackedCostCents
  const budgetConsumedPercent = input.budgetCents > 0
    ? Math.round((trackedCostCents / input.budgetCents) * 1000) / 10
    : null

  return {
    ...input,
    trackedCostCents,
    forecastMarginCents,
    actualMarginCents,
    budgetConsumedPercent,
  }
}
