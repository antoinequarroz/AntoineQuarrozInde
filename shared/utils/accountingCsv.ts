export type AccountingExportEntry = {
  kind: 'payment' | 'checkout'
  status: 'confirmed' | 'voided' | 'open' | 'expired' | 'cancelled'
  occurredAt: string
  paidAt: string | null
  invoiceNumber: string
  clientName: string
  amountCents: number
  currency: string
  method: string
  provider: string | null
  reference: string | null
  note: string | null
}

const methodLabels: Record<string, string> = {
  bank_transfer: 'Virement',
  swiss_qr: 'QR suisse',
  twint: 'TWINT',
  cash: 'Espèces',
  other: 'Autre',
}

const statusLabels: Record<AccountingExportEntry['status'], string> = {
  confirmed: 'Confirmé',
  voided: 'Annulé',
  open: 'En attente',
  expired: 'Expiré',
  cancelled: 'Interrompu',
}

const headers = [
  'Date du mouvement',
  'Date du paiement',
  'Type',
  'Statut',
  'Facture',
  'Client',
  'Moyen',
  'Montant',
  'Devise',
  'Prestataire',
  'Référence',
  'Note',
]

export function spreadsheetSafe(value: unknown) {
  const text = String(value ?? '').replace(/\0/g, '')
  return /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
}

function csvCell(value: unknown) {
  return `"${spreadsheetSafe(value).replace(/"/g, '""')}"`
}

function accountingAmount(cents: number) {
  return (Math.round(Number(cents || 0)) / 100).toFixed(2).replace('.', ',')
}

export function buildAccountingCsv(entries: AccountingExportEntry[]) {
  const rows = entries.map(entry => [
    entry.occurredAt,
    entry.paidAt || '',
    entry.kind === 'payment' ? 'Encaissement' : 'Session de paiement',
    statusLabels[entry.status],
    entry.invoiceNumber,
    entry.clientName,
    methodLabels[entry.method] || entry.method,
    accountingAmount(entry.amountCents),
    entry.currency,
    entry.provider || '',
    entry.reference || '',
    entry.note || '',
  ])

  return `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n')}\r\n`
}
