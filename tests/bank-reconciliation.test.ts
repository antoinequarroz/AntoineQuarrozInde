import { describe, expect, it } from 'vitest'
import {
  bankFingerprintPayload,
  matchBankTransaction,
  normalizeConfirmedBankTransaction,
  parseAccountingAmount,
  parseBankCsv,
  type BankTransaction,
  type ReconciliationInvoice,
} from '../shared/utils/bankReconciliation'
import { buildReconciliationCandidates } from '../server/utils/paymentReconciliation'
import { parseCamt053 } from '../shared/utils/camt053'

const invoices: ReconciliationInvoice[] = [
  { id: 11, number: 'FAC-2026-0011', clientName: 'Atelier numérique', balanceCents: 14_050, currency: 'CHF', paymentReference: 'RF18 5390 0754 7034' },
  { id: 12, number: 'FAC-2026-0012', clientName: 'Studio pilote', balanceCents: 8_500, currency: 'CHF', paymentReference: '21 00000 00003 13947 14300 09017' },
]

function transaction(patch: Partial<BankTransaction> = {}): BankTransaction {
  return { id: 'row-2', rowNumber: 2, bookedAt: '2026-08-10', amountCents: 14_050, currency: 'CHF', reference: null, description: null, transactionId: null, ...patch }
}

describe('bank reconciliation CSV', () => {
  it('parses booked CAMT.053 credits and rejects debits', () => {
    const result = parseCamt053(`<?xml version="1.0"?><Document><BkToCstmrStmt><Stmt><Ntry><Amt Ccy="CHF">140.50</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts>BOOK</Sts><BookgDt><Dt>2026-08-10</Dt></BookgDt><AcctSvcrRef>TX-CAMT-1</AcctSvcrRef><AddtlNtryInf>FAC-2026-0011</AddtlNtryInf></Ntry><Ntry><Amt Ccy="CHF">5.00</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-08-10</Dt></BookgDt><AcctSvcrRef>FEE-1</AcctSvcrRef></Ntry></Stmt></BkToCstmrStmt></Document>`)
    expect(result.transactions).toEqual([expect.objectContaining({ amountCents: 14_050, currency: 'CHF', transactionId: 'TX-CAMT-1' })])
    expect(result.rejected).toEqual([{ rowNumber: 2, reason: 'Sortie d’argent ignorée' }])
  })
  it('splits batched CAMT entries into individual payment transactions', () => {
    const xml = `<Document><BkToCstmrStmt><Stmt><Ntry><CdtDbtInd>CRDT</CdtDbtInd><Sts>BOOK</Sts><BookgDt><Dt>2026-08-10</Dt></BookgDt><NtryDtls><TxDtls><Amt Ccy="CHF">12.50</Amt><Refs><TxId>T1</TxId></Refs><RmtInf><Ustrd>FAC-1</Ustrd></RmtInf></TxDtls><TxDtls><Amt Ccy="CHF">20.00</Amt><Refs><TxId>T2</TxId></Refs><RmtInf><Ustrd>FAC-2</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry></Stmt></BkToCstmrStmt></Document>`
    const result = parseCamt053(xml)
    expect(result.transactions.map(row => [row.transactionId, row.amountCents])).toEqual([['T1', 1250], ['T2', 2000]])
  })
  it('rejects batch details that only share a parent identifier', () => {
    const xml = `<Document><BkToCstmrStmt><Stmt><Ntry><CdtDbtInd>CRDT</CdtDbtInd><Sts>BOOK</Sts><BookgDt><Dt>2026-08-10</Dt></BookgDt><AcctSvcrRef>BATCH-1</AcctSvcrRef><NtryDtls><TxDtls><Amt Ccy="CHF">12.50</Amt></TxDtls><TxDtls><Amt Ccy="CHF">20.00</Amt></TxDtls></NtryDtls></Ntry></Stmt></BkToCstmrStmt></Document>`
    const result = parseCamt053(xml)
    expect(result.transactions).toEqual([])
    expect(result.rejected).toEqual([
      { rowNumber: 1, reason: 'Identifiant bancaire individuel absent' },
      { rowNumber: 2, reason: 'Identifiant bancaire individuel absent' },
    ])
  })
  it('rejects CAMT batch placeholders that are not individual bank identifiers', () => {
    const xml = `<Document><BkToCstmrStmt><Stmt><Ntry><CdtDbtInd>CRDT</CdtDbtInd><Sts>BOOK</Sts><BookgDt><Dt>2026-08-10</Dt></BookgDt><NtryDtls><TxDtls><Amt Ccy="CHF">12.50</Amt><Refs><EndToEndId>NOTPROVIDED</EndToEndId></Refs><RmtInf><Ustrd>FAC-1</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry></Stmt></BkToCstmrStmt></Document>`
    const result = parseCamt053(xml)
    expect(result.transactions).toEqual([])
    expect(result.rejected[0]).toEqual({ rowNumber: 1, reason: 'Identifiant bancaire individuel absent' })
  })
  it('parses Swiss decimal formats, quoted delimiters and rejects outgoing rows', () => {
    const result = parseBankCsv([
      'Date;Crédit;Débit;Devise;Référence;Libellé;Transaction ID',
      '10.08.2026;"1\'234,50";;CHF;RF18 5390 0754 7034;"Facture; août";TX-001',
      '11.08.2026;;45,00;CHF;;Frais bancaires;TX-002',
    ].join('\r\n'))

    expect(result.delimiter).toBe(';')
    expect(result.transactions).toEqual([expect.objectContaining({ bookedAt: '2026-08-10', amountCents: 123_450, currency: 'CHF', transactionId: 'TX-001', description: 'Facture; août' })])
    expect(result.rejected).toEqual([{ rowNumber: 3, reason: 'Sortie d’argent ignorée' }])
    expect(parseAccountingAmount('CHF 1,234.50')).toBe(123_450)
  })

  it('supports comma CSV and reports missing required columns', () => {
    expect(parseBankCsv('Booking date,Amount,Currency,Description\n2026-08-10,140.50,CHF,FAC-2026-0011').transactions[0]).toMatchObject({ amountCents: 14_050 })
    expect(parseBankCsv('Booking date,Amount,Currency,Description\n2026-08-10,140.50,CHF,').rejected).toEqual([{ rowNumber: 2, reason: 'Identifiant bancaire absent' }])
    expect(() => parseBankCsv('Description;Montant\nTest;10,00')).toThrow(/date introuvable/i)
  })

  it('matches exact references and invoice numbers before a unique amount', () => {
    expect(matchBankTransaction(transaction({ reference: 'Paiement RF18539007547034' }), invoices)).toMatchObject({ confidence: 'exact', invoiceId: 11, reason: 'Référence de paiement exacte' })
    expect(matchBankTransaction(transaction({ description: 'Règlement FAC-2026-0011' }), invoices)).toMatchObject({ confidence: 'exact', invoiceId: 11, reason: 'Numéro de facture reconnu' })
    expect(matchBankTransaction(transaction(), invoices)).toMatchObject({ confidence: 'probable', invoiceId: 11, reason: 'Montant et devise uniques' })
  })

  it('never auto-selects equal balances and leaves unmatched rows explicit', () => {
    const duplicateBalance = [...invoices, { ...invoices[0], id: 13, number: 'FAC-2026-0013', paymentReference: null }]
    expect(matchBankTransaction(transaction(), duplicateBalance)).toMatchObject({ confidence: 'ambiguous', invoiceId: null, candidateIds: [11, 13] })
    expect(matchBankTransaction(transaction({ amountCents: 999 }), invoices)).toMatchObject({ confidence: 'none', invoiceId: null })
    expect(matchBankTransaction(transaction({ amountCents: 14_051, reference: 'RF18 5390 0754 7034' }), invoices)).toMatchObject({ confidence: 'none', invoiceId: null })
  })

  it('normalizes confirmation input and produces a stable fingerprint payload', () => {
    const normalized = normalizeConfirmedBankTransaction({ bookedAt: '10.08.2026', amountCents: 14_050, currency: 'chf', reference: ' RF18 5390 ', description: '  Paiement   final  ', transactionId: 'TX-1' })
    expect(normalized).toEqual({ bookedAt: '2026-08-10', amountCents: 14_050, currency: 'CHF', reference: 'RF18 5390', description: 'Paiement final', transactionId: 'TX-1' })
    expect(bankFingerprintPayload(normalized)).toBe('ID|TX1')
    expect(bankFingerprintPayload(normalizeConfirmedBankTransaction({ bookedAt: '10.08.2026', amountCents: 14_050, currency: 'CHF', reference: 'RF18 5390' }))).toBe('REF|2026-08-10|14050|CHF|RF185390')
    expect(bankFingerprintPayload(normalizeConfirmedBankTransaction({ bookedAt: '10.08.2026', amountCents: 14_050, currency: 'CHF' }))).toBeNull()
    expect(() => normalizeConfirmedBankTransaction({ bookedAt: '2026-02-30', amountCents: 100, currency: 'CHF' })).toThrow(/date bancaire/i)
  })

  it('keeps the migration append-only and organization-unique', async () => {
    const migration = await import('node:fs/promises').then(fs => fs.readFile(new URL('../supabase/migrations/20260810221013_add_bank_import_fingerprint.sql', import.meta.url), 'utf8'))
    expect(migration).toContain('add column if not exists bank_import_fingerprint')
    expect(migration).toContain('on public.invoice_payments(organization_id, bank_import_fingerprint)')
    expect(migration).toContain('where bank_import_fingerprint is not null')
    expect(migration).toContain('function public.record_invoice_payment_atomic')
    expect(migration).toContain('for update')
    expect(migration).toContain("grant execute on function public.record_invoice_payment_atomic")
    expect(migration).not.toMatch(/drop\s+(table|column)/i)
  })

  it('builds remaining balances without voided payments', () => {
    expect(buildReconciliationCandidates({
      clients: [{ id: 7, name: 'Client pilote', company: null }],
      invoices: [{ id: 11, client_id: 7, number: 'FAC-11', total_cents: 10_000, currency: 'CHF', payment_reference: 'RF11' }],
      payments: [
        { invoice_id: 11, amount_cents: 2_000, voided_at: null },
        { invoice_id: 11, amount_cents: 1_000, voided_at: '2026-08-10T12:00:00Z' },
      ],
    })).toEqual([{ id: 11, number: 'FAC-11', clientName: 'Client pilote', balanceCents: 8_000, currency: 'CHF', paymentReference: 'RF11' }])
  })

  it('keeps reconciliation routes manager-only and organization-scoped', async () => {
    const fs = await import('node:fs/promises')
    const readRoute = await fs.readFile(new URL('../server/api/admin/payment-reconciliation.get.ts', import.meta.url), 'utf8')
    const writeRoute = await fs.readFile(new URL('../server/api/admin/payment-reconciliation.post.ts', import.meta.url), 'utf8')
    const recorder = await fs.readFile(new URL('../server/utils/recordInvoicePayment.ts', import.meta.url), 'utf8')
    expect(readRoute).toContain('requireAdmin(event)')
    expect(readRoute.match(/\.eq\('organization_id', org\.id\)/g)).toHaveLength(3)
    expect(writeRoute).toContain('requireAdmin(event)')
    expect(writeRoute).toContain("createHash('sha256')")
    expect(writeRoute).toContain("source: 'bank_reconciliation'")
    expect(writeRoute).toContain('aucun identifiant bancaire stable')
    expect(recorder).toContain("supabase.rpc('record_invoice_payment_atomic'")
    expect(recorder).toContain("statusCode: 409, message: 'Ce mouvement bancaire a déjà été rapproché.'")
    expect(recorder).not.toContain('bankFingerprintPayload')
  })
})
