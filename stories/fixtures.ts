export const money = (cents: number, currency = 'CHF') => new Intl.NumberFormat('fr-CH', { style: 'currency', currency }).format(cents / 100)
export const dateLabel = (date: string) => new Intl.DateTimeFormat('fr-CH', { timeZone: 'UTC' }).format(new Date(date))
export const invoice = { id: 90001, number: 'DEMO-2026-001', total_cents: 125000, paid_cents: 0, currency: 'CHF', status: 'sent', document_type: 'invoice' }
export const quote = { id: 90002, number: 'DEMO-D-001', title: 'Site de démonstration', total_cents: 240000, currency: 'CHF', status: 'sent', valid_until: '2026-12-31', accepted_at: null }
export const remainingCents = (item: typeof invoice) => Math.max(0, item.total_cents - item.paid_cents)
export const canPay = (item: typeof invoice) => item.document_type === 'invoice' && remainingCents(item) > 0 && remainingCents(item) <= 500000 && item.currency === 'CHF'
