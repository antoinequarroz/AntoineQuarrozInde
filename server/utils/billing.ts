type BillingItemInput = {
  label?: string
  description?: string | null
  quantity?: number
  unitPriceCents?: number
  taxRate?: number
}

export type NormalizedBillingItem = {
  position: number
  label: string
  description: string | null
  quantity: number
  unit_price_cents: number
  tax_rate: number
  total_cents: number
}

export function normalizeBillingItems(items: unknown): NormalizedBillingItem[] {
  const list = Array.isArray(items) ? items as BillingItemInput[] : []
  return list
    .map((raw, idx) => {
      const quantity = Number(raw.quantity || 0)
      const unitPriceCents = Number(raw.unitPriceCents || 0)
      const taxRate = Number(raw.taxRate || 0)
      const base = Math.round(quantity * unitPriceCents)
      const total = Math.round(base * (1 + taxRate / 100))
      return {
        position: idx,
        label: String(raw.label || '').trim(),
        description: raw.description ? String(raw.description) : null,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unit_price_cents: Number.isFinite(unitPriceCents) && unitPriceCents >= 0 ? unitPriceCents : 0,
        tax_rate: Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : 0,
        total_cents: Number.isFinite(total) && total >= 0 ? total : 0,
      }
    })
    .filter(item => item.label.length > 0)
}

export function computeTotals(items: NormalizedBillingItem[]) {
  const subtotalCents = items.reduce((acc, item) => acc + Math.round(item.quantity * item.unit_price_cents), 0)
  const totalCents = items.reduce((acc, item) => acc + item.total_cents, 0)
  const taxCents = Math.max(0, totalCents - subtotalCents)
  return { subtotalCents, taxCents, totalCents }
}
