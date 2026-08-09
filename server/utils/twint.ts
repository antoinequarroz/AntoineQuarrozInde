export const TWINT_CURRENCY = 'CHF'
export const TWINT_MAX_AMOUNT_CENTS = 500_000

export type TwintInvoiceInput = {
  status: string
  currency: string
  documentType?: string | null
  totalCents: number
  paidAmountCents: number
}

export function getTwintBalance(invoice: TwintInvoiceInput) {
  return Math.max(0, invoice.totalCents - invoice.paidAmountCents)
}

export function getTwintEligibility(invoice: TwintInvoiceInput, configured = true) {
  if (!configured) return { eligible: false, reason: 'Le paiement TWINT n’est pas encore activé.' }
  if (invoice.documentType === 'credit_note') return { eligible: false, reason: 'Un avoir ne peut pas être payé.' }
  if (invoice.currency.toUpperCase() !== TWINT_CURRENCY) return { eligible: false, reason: 'TWINT accepte uniquement les paiements en CHF.' }
  if (invoice.status === 'cancelled') return { eligible: false, reason: 'Cette facture est annulée.' }
  const balance = getTwintBalance(invoice)
  if (balance <= 0) return { eligible: false, reason: 'Cette facture est déjà réglée.' }
  if (balance > TWINT_MAX_AMOUNT_CENTS) return { eligible: false, reason: 'TWINT accepte au maximum 5’000 CHF par paiement.' }
  return { eligible: true, reason: null }
}

export function isTwintConfigured(config: { stripeSecretKey?: unknown, stripeWebhookSecret?: unknown }) {
  return Boolean(String(config.stripeSecretKey || '').trim() && String(config.stripeWebhookSecret || '').trim())
}
