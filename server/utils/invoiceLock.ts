export const immutableInvoiceFields = [
  'number',
  'clientId',
  'quoteId',
  'currency',
  'issuedAt',
  'dueAt',
  'items',
  'amountCents',
  'paymentReferenceType',
  'paymentReference',
  'documentType',
  'creditedInvoiceId',
] as const

export function isInvoiceLocked(invoice: { locked_at?: string | null, status?: string | null }) {
  return Boolean(invoice.locked_at) || invoice.status !== 'draft'
}

export function canDeleteInvoice(status: string | null | undefined, organizationSlug?: string | null) {
  return status === 'draft' || organizationSlug === 'aq-e2e-sandbox'
}

export function hasLockedInvoiceContentMutation(body: Record<string, unknown>) {
  return immutableInvoiceFields.some(field => Object.hasOwn(body, field))
}
