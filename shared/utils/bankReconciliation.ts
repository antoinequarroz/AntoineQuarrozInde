export type BankTransaction = {
  id: string
  rowNumber: number
  bookedAt: string
  amountCents: number
  currency: string
  reference: string | null
  description: string | null
  transactionId: string | null
}

export type ReconciliationInvoice = {
  id: number
  number: string
  clientName: string
  balanceCents: number
  currency: string
  paymentReference: string | null
}

export type ReconciliationMatch = {
  confidence: 'exact' | 'probable' | 'ambiguous' | 'none'
  invoiceId: number | null
  candidateIds: number[]
  reason: string
}

export type BankCsvResult = {
  transactions: BankTransaction[]
  rejected: Array<{ rowNumber: number, reason: string }>
  delimiter: ';' | ',' | '\t'
  headers: string[]
}

const aliases = {
  date: ['date', 'bookingdate', 'bookedat', 'datecomptable', 'datedecomptabilisation', 'datevaleur', 'valutadatum'],
  amount: ['montant', 'amount', 'betrag', 'montantchf', 'amountchf'],
  credit: ['credit', 'creditamount', 'montantcredit', 'gutschrift'],
  debit: ['debit', 'debitamount', 'montantdebit', 'belastung'],
  currency: ['devise', 'currency', 'waehrung', 'wahrung'],
  reference: ['reference', 'paymentreference', 'qrreference', 'communication', 'ref', 'referencedepaiement'],
  description: ['libelle', 'description', 'details', 'bookingtext', 'texte', 'motif', 'message'],
  transactionId: ['transactionid', 'transactionidentifier', 'bookingid', 'entryid', 'idtransaction', 'identifiant'],
} as const

function headerKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function parseCsvRows(input: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"'
        index += 1
      }
      else quoted = !quoted
    }
    else if (char === delimiter && !quoted) {
      row.push(cell)
      cell = ''
    }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some(value => value.trim())) rows.push(row)
      row = []
      cell = ''
    }
    else cell += char
  }
  row.push(cell)
  if (row.some(value => value.trim())) rows.push(row)
  return rows
}

function detectDelimiter(input: string): ';' | ',' | '\t' {
  const firstLine = input.split(/\r?\n/, 1)[0] || ''
  const candidates = [';', '\t', ','] as const
  return candidates
    .map(delimiter => ({ delimiter, count: parseCsvRows(firstLine, delimiter)[0]?.length || 0 }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter || ';'
}

function findColumn(headers: string[], names: readonly string[]) {
  return headers.findIndex(header => names.includes(header as never))
}

export function parseAccountingAmount(value: unknown) {
  let text = String(value ?? '').trim()
  if (!text) return null
  const parenthesized = /^\(.*\)$/.test(text)
  text = text.replace(/[()'’\sA-Za-z]/g, '').replace(/[^0-9,.-]/g, '')
  if (!text || !/[0-9]/.test(text)) return null

  const comma = text.lastIndexOf(',')
  const dot = text.lastIndexOf('.')
  const separator = Math.max(comma, dot)
  let normalized: string
  if (separator >= 0) {
    const decimals = text.length - separator - 1
    if (decimals === 1 || decimals === 2) {
      normalized = `${text.slice(0, separator).replace(/[.,]/g, '')}.${text.slice(separator + 1)}`
    }
    else normalized = text.replace(/[.,]/g, '')
  }
  else normalized = text

  const amount = Number(normalized)
  if (!Number.isFinite(amount)) return null
  return Math.round((parenthesized ? -Math.abs(amount) : amount) * 100)
}

export function normalizeBankDate(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/)
  if (iso) return validIsoDate(`${iso[1]!}-${iso[2]!}-${iso[3]!}`)
  const european = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (!european) return null
  return validIsoDate(`${european[3]!}-${european[2]!.padStart(2, '0')}-${european[1]!.padStart(2, '0')}`)
}

function validIsoDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value
}

function optionalCell(row: string[], index: number) {
  const value = index >= 0 ? String(row[index] || '').trim() : ''
  return value || null
}

export function parseBankCsv(input: string): BankCsvResult {
  const text = String(input || '').replace(/^\uFEFF/, '')
  if (!text.trim()) throw new Error('Le fichier CSV est vide.')
  const delimiter = detectDelimiter(text)
  const rows = parseCsvRows(text, delimiter)
  if (rows.length < 2) throw new Error('Le fichier doit contenir un en-tête et au moins une opération.')

  const headers = rows[0]!.map(value => value.trim())
  const keys = headers.map(headerKey)
  const dateIndex = findColumn(keys, aliases.date)
  const amountIndex = findColumn(keys, aliases.amount)
  const creditIndex = findColumn(keys, aliases.credit)
  const debitIndex = findColumn(keys, aliases.debit)
  if (dateIndex < 0) throw new Error('Colonne de date introuvable.')
  if (amountIndex < 0 && creditIndex < 0) throw new Error('Colonne de montant ou de crédit introuvable.')

  const currencyIndex = findColumn(keys, aliases.currency)
  const referenceIndex = findColumn(keys, aliases.reference)
  const descriptionIndex = findColumn(keys, aliases.description)
  const transactionIdIndex = findColumn(keys, aliases.transactionId)
  const transactions: BankTransaction[] = []
  const rejected: BankCsvResult['rejected'] = []

  rows.slice(1).forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2
    const bookedAt = normalizeBankDate(row[dateIndex])
    const rawAmount = amountIndex >= 0 ? row[amountIndex] : row[creditIndex]
    const amountCents = parseAccountingAmount(rawAmount)
    const debitCents = debitIndex >= 0 ? parseAccountingAmount(row[debitIndex]) : null
    if (!bookedAt) return void rejected.push({ rowNumber, reason: 'Date invalide' })
    if (amountCents == null) {
      const reason = debitCents && debitCents > 0 ? 'Sortie d’argent ignorée' : 'Montant invalide'
      return void rejected.push({ rowNumber, reason })
    }
    if (amountCents <= 0) return void rejected.push({ rowNumber, reason: 'Sortie d’argent ignorée' })
    const currency = (optionalCell(row, currencyIndex) || 'CHF').toUpperCase()
    if (!/^[A-Z]{3}$/.test(currency)) return void rejected.push({ rowNumber, reason: 'Devise invalide' })
    const reference = optionalCell(row, referenceIndex)
    const description = optionalCell(row, descriptionIndex)
    const transactionId = optionalCell(row, transactionIdIndex)
    if (!reference && !description && !transactionId) return void rejected.push({ rowNumber, reason: 'Identifiant bancaire absent' })

    transactions.push({
      id: `row-${rowNumber}`,
      rowNumber,
      bookedAt,
      amountCents,
      currency,
      reference,
      description,
      transactionId,
    })
  })

  return { transactions, rejected, delimiter, headers }
}

function referenceKey(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function matchBankTransaction(transaction: BankTransaction, invoices: ReconciliationInvoice[]): ReconciliationMatch {
  const eligible = invoices.filter(invoice => invoice.balanceCents >= transaction.amountCents && invoice.currency === transaction.currency)
  const haystack = referenceKey(`${transaction.reference || ''} ${transaction.description || ''}`)
  const referenceMatches = eligible.filter(invoice => invoice.paymentReference && haystack.includes(referenceKey(invoice.paymentReference)))
  if (referenceMatches.length === 1) {
    const invoice = referenceMatches[0]!
    return { confidence: 'exact', invoiceId: invoice.id, candidateIds: [invoice.id], reason: 'Référence de paiement exacte' }
  }
  if (referenceMatches.length > 1) return { confidence: 'ambiguous', invoiceId: null, candidateIds: referenceMatches.map(invoice => invoice.id), reason: 'Référence partagée par plusieurs factures' }

  const numberMatches = eligible.filter(invoice => haystack.includes(referenceKey(invoice.number)))
  if (numberMatches.length === 1) {
    const invoice = numberMatches[0]!
    return { confidence: 'exact', invoiceId: invoice.id, candidateIds: [invoice.id], reason: 'Numéro de facture reconnu' }
  }
  if (numberMatches.length > 1) return { confidence: 'ambiguous', invoiceId: null, candidateIds: numberMatches.map(invoice => invoice.id), reason: 'Plusieurs numéros de facture reconnus' }

  const amountMatches = eligible.filter(invoice => invoice.balanceCents === transaction.amountCents)
  if (amountMatches.length === 1) {
    const invoice = amountMatches[0]!
    return { confidence: 'probable', invoiceId: invoice.id, candidateIds: [invoice.id], reason: 'Montant et devise uniques' }
  }
  if (amountMatches.length > 1) return { confidence: 'ambiguous', invoiceId: null, candidateIds: amountMatches.map(invoice => invoice.id), reason: 'Plusieurs factures ont ce solde' }
  return { confidence: 'none', invoiceId: null, candidateIds: [], reason: 'Aucune facture compatible' }
}

function boundedText(value: unknown, maximum: number) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ')
  return text ? text.slice(0, maximum) : null
}

export function normalizeConfirmedBankTransaction(input: Record<string, unknown>) {
  const bookedAt = normalizeBankDate(input.bookedAt)
  const amountCents = Number(input.amountCents)
  const currency = String(input.currency || 'CHF').trim().toUpperCase()
  if (!bookedAt) throw new Error('Date bancaire invalide.')
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('Montant bancaire invalide.')
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Devise bancaire invalide.')
  return {
    bookedAt,
    amountCents,
    currency,
    reference: boundedText(input.reference, 500),
    description: boundedText(input.description, 1000),
    transactionId: boundedText(input.transactionId, 200),
  }
}

export function bankFingerprintPayload(input: ReturnType<typeof normalizeConfirmedBankTransaction>) {
  const transactionId = referenceKey(input.transactionId)
  if (transactionId) return `ID|${transactionId}`

  const reference = referenceKey(input.reference)
  if (reference) return `REF|${input.bookedAt}|${input.amountCents}|${input.currency}|${reference}`

  const description = referenceKey(input.description)
  if (description) return `DESC|${input.bookedAt}|${input.amountCents}|${input.currency}|${description}`

  return null
}
