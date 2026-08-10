import type { BankCsvResult, BankTransaction } from './bankReconciliation'
import { normalizeBankDate, parseAccountingAmount } from './bankReconciliation'

function blocks(xml: string, tag: string) {
  const pattern = new RegExp(`<(?:[\\w.-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${tag}>`, 'gi')
  return [...xml.matchAll(pattern)].map(match => match[1] || '')
}

function value(xml: string, tag: string) {
  const content = blocks(xml, tag)[0]
  return content ? content.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : null
}

function entryAmount(xml: string) {
  const match = xml.match(/<(?:[\w.-]+:)?Amt\b([^>]*)>([^<]+)<\/(?:[\w.-]+:)?Amt>/i)
  return { amountCents: parseAccountingAmount(match?.[2]), currency: match?.[1]?.match(/\bCcy=["']([A-Z]{3})["']/i)?.[1]?.toUpperCase() || 'CHF' }
}

function bankTransactionId(...values: Array<string | null>) {
  const placeholderIds = new Set(['NOTPROVIDED', 'NOTAVAILABLE', 'UNKNOWN', 'NA', 'NONE'])
  for (const value of values) {
    const candidate = String(value || '').trim()
    if (!candidate) continue
    const normalized = candidate.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!placeholderIds.has(normalized)) return candidate
  }
  return null
}

export function parseCamt053(input: string): BankCsvResult {
  const xml = String(input || '').trim()
  if (!xml) throw new Error('Le fichier CAMT est vide.')
  if (xml.length > 10_000_000) throw new Error('Le fichier CAMT dépasse la taille maximale de 10 Mo.')
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Les déclarations XML externes ne sont pas autorisées.')
  if (!/<(?:[\w.-]+:)?BkToCstmrStmt\b/i.test(xml)) throw new Error('Ce fichier n’est pas un relevé CAMT.053.')
  const transactions: BankTransaction[] = []
  const rejected: BankCsvResult['rejected'] = []
  const entries = blocks(xml, 'Ntry')
  if (entries.length > 10_000) throw new Error('Le relevé contient plus de 10’000 écritures.')
  let rowNumber = 0
  entries.forEach((entry) => {
    const entryDirection = value(entry, 'CdtDbtInd')
    const detailBlocks = blocks(entry, 'TxDtls')
    const units = detailBlocks.length ? detailBlocks : [entry]
    units.forEach((unit) => {
      rowNumber += 1
      const direction = value(unit, 'CdtDbtInd') || entryDirection
      if (direction !== 'CRDT') return void rejected.push({ rowNumber, reason: 'Sortie d’argent ignorée' })
      const status = value(entry, 'Sts')
      if (status && status !== 'BOOK') return void rejected.push({ rowNumber, reason: 'Mouvement non comptabilisé' })
      const dateBlock = blocks(entry, 'BookgDt')[0] || ''
      const bookedAt = normalizeBankDate(value(dateBlock, 'Dt') || value(entry, 'BookgDt'))
      const parsed = entryAmount(unit)
      const transactionId = bankTransactionId(value(unit, 'AcctSvcrRef'), value(unit, 'TxId'), value(unit, 'EndToEndId'), detailBlocks.length ? null : value(entry, 'AcctSvcrRef'))
      const reference = value(unit, 'Ref')
      const description = value(unit, 'Ustrd') || value(unit, 'AddtlTxInf') || value(entry, 'AddtlNtryInf')
      if (!bookedAt) return void rejected.push({ rowNumber, reason: 'Date invalide' })
      if (!parsed.amountCents || parsed.amountCents <= 0) return void rejected.push({ rowNumber, reason: 'Montant invalide' })
      if (detailBlocks.length && !transactionId) return void rejected.push({ rowNumber, reason: 'Identifiant bancaire individuel absent' })
      if (!transactionId && !reference && !description) return void rejected.push({ rowNumber, reason: 'Identifiant bancaire absent' })
      transactions.push({ id: `camt-${rowNumber}`, rowNumber, bookedAt, amountCents: parsed.amountCents, currency: parsed.currency, reference, description, transactionId })
    })
  })
  return { transactions, rejected, delimiter: ';', headers: ['CAMT.053'] }
}
