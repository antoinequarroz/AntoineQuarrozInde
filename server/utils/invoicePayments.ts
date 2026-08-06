const PAYMENT_METHODS = new Set(['bank_transfer', 'swiss_qr', 'twint', 'cash', 'other'])

export function normalizeInvoicePayment(input: Record<string, unknown>) {
  const amountCents = Number(input.amountCents)
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Le montant du paiement doit être supérieur à zéro.')
  }

  const method = String(input.method || 'bank_transfer')
  if (!PAYMENT_METHODS.has(method)) throw new Error('Mode de paiement invalide.')

  const rawPaidAt = String(input.paidAt || new Date().toISOString().slice(0, 10))
  const paidAt = new Date(`${rawPaidAt}T12:00:00.000Z`)
  if (Number.isNaN(paidAt.getTime())) throw new Error('Date de paiement invalide.')

  return {
    amountCents,
    method: method as 'bank_transfer' | 'swiss_qr' | 'twint' | 'cash' | 'other',
    paidAt: paidAt.toISOString().slice(0, 10),
    reference: String(input.reference || '').trim() || null,
    notes: String(input.notes || '').trim() || null,
  }
}

export function invoiceStatusFromPayments(input: {
  totalCents: number
  paidAmountCents: number
  dueAt?: string | null
  today?: string
}) {
  if (input.paidAmountCents >= input.totalCents && input.totalCents > 0) return 'paid' as const
  const today = input.today || new Date().toISOString().slice(0, 10)
  if (input.dueAt && input.dueAt < today) return 'overdue' as const
  return 'sent' as const
}
