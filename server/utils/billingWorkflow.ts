export type BillingKind = 'quote' | 'invoice'

const PREFIX: Record<BillingKind, string> = {
  quote: 'DEV',
  invoice: 'FAC',
}

export function nextBillingNumber(kind: BillingKind, existingNumbers: string[], date = new Date()) {
  const year = date.getUTCFullYear()
  const prefix = `${PREFIX[kind]}-${year}-`
  const highest = existingNumbers.reduce((max, number) => {
    if (!number.startsWith(prefix)) return max
    const sequence = Number(number.slice(prefix.length))
    return Number.isInteger(sequence) && sequence > max ? sequence : max
  }, 0)
  return `${prefix}${String(highest + 1).padStart(4, '0')}`
}

export function addDaysIso(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

export function paymentTermsFromNotes(notes: string | null | undefined, fallback = 30) {
  const match = String(notes || '').match(/Paiement\s*:\s*(\d{1,3})\s*jours/i)
  if (!match) return fallback
  const days = Number(match[1])
  return days >= 0 && days <= 365 ? days : fallback
}
