const INVOICE_STATUSES = new Set(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
const ALLOWED_INVOICE_TRANSITIONS: Record<string, Set<string>> = {
  draft: new Set(['draft', 'sent', 'cancelled']),
  sent: new Set(['sent', 'overdue', 'cancelled']),
  overdue: new Set(['overdue', 'cancelled']),
  paid: new Set(['paid']),
  cancelled: new Set(['cancelled']),
}

export function assertInvoiceStatusTransition(currentInput: unknown, nextInput: unknown) {
  const current = String(currentInput || '')
  const next = String(nextInput || '')
  if (!INVOICE_STATUSES.has(current) || !INVOICE_STATUSES.has(next)) {
    throw new Error('Invalid invoice status')
  }
  if (!ALLOWED_INVOICE_TRANSITIONS[current]?.has(next)) {
    throw new Error(`La transition de ${current} vers ${next} n’est pas autorisée.`)
  }
}

export function normalizeInvoicePaymentState(statusInput: unknown, paidAtInput: unknown, now = new Date()) {
  const status = String(statusInput || 'draft')
  if (!INVOICE_STATUSES.has(status)) {
    throw new Error('Invalid invoice status')
  }

  if (status !== 'paid') {
    return { status, paidAt: null }
  }

  const rawPaidAt = String(paidAtInput || '').trim()
  if (!rawPaidAt) {
    return { status, paidAt: now.toISOString().slice(0, 10) }
  }

  const paidAt = new Date(rawPaidAt)
  if (Number.isNaN(paidAt.getTime())) {
    throw new Error('Invalid payment date')
  }

  return { status, paidAt: paidAt.toISOString().slice(0, 10) }
}
