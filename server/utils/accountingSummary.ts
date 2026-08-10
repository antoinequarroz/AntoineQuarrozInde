type DocumentRow = { id: number, document_type?: string | null, status: string, subtotal_cents?: number | null, tax_cents?: number | null, total_cents?: number | null, amount_cents?: number | null }
type ItemRow = { invoice_id: number, quantity: number, unit_price_cents: number, tax_rate: number, total_cents: number }
type PaymentRow = { amount_cents: number, currency: string, voided_at?: string | null }

export function buildAccountingSummary(documents: DocumentRow[], items: ItemRow[], payments: PaymentRow[]) {
  const active = documents.filter(document => ['sent', 'overdue', 'paid'].includes(document.status))
  const byId = new Map(active.map(document => [document.id, document]))
  const vat = new Map<number, { taxRate: number, taxableCents: number, taxCents: number, grossCents: number }>()
  for (const item of items) {
    const document = byId.get(item.invoice_id)
    if (!document) continue
    const sign = document.document_type === 'credit_note' ? -1 : 1
    const taxable = Math.round(Number(item.quantity) * Number(item.unit_price_cents)) * sign
    const gross = Number(item.total_cents) * sign
    const rate = Number(item.tax_rate || 0)
    const row = vat.get(rate) || { taxRate: rate, taxableCents: 0, taxCents: 0, grossCents: 0 }
    row.taxableCents += taxable; row.grossCents += gross; row.taxCents += gross - taxable
    vat.set(rate, row)
  }
  const totals = active.reduce((sum, document) => {
    const sign = document.document_type === 'credit_note' ? -1 : 1
    sum.subtotalCents += Number(document.subtotal_cents ?? document.amount_cents ?? 0) * sign
    sum.taxCents += Number(document.tax_cents ?? 0) * sign
    sum.totalCents += Number(document.total_cents ?? document.amount_cents ?? 0) * sign
    if (sign < 0) sum.creditNotesCents += Number(document.total_cents ?? document.amount_cents ?? 0)
    return sum
  }, { subtotalCents: 0, taxCents: 0, totalCents: 0, creditNotesCents: 0 })
  const collectedByCurrency: Record<string, number> = {}
  for (const payment of payments) if (!payment.voided_at) collectedByCurrency[payment.currency] = (collectedByCurrency[payment.currency] || 0) + Number(payment.amount_cents)
  return { totals, vatRows: [...vat.values()].sort((a, b) => a.taxRate - b.taxRate), collectedByCurrency, documentCount: active.length }
}
