const INVOICE_STATUSES = new Set(['draft', 'sent', 'paid', 'overdue', 'cancelled'])

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
