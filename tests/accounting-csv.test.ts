import { describe, expect, it } from 'vitest'
import { buildAccountingCsv, spreadsheetSafe } from '../shared/utils/accountingCsv'

describe('accounting CSV export', () => {
  it('produces an Excel-friendly Swiss accounting journal', () => {
    const csv = buildAccountingCsv([{
      kind: 'payment',
      status: 'confirmed',
      occurredAt: '2026-08-10T12:00:00.000Z',
      paidAt: '2026-08-10',
      invoiceNumber: 'FAC-2026-0011',
      clientName: 'Atelier numérique',
      amountCents: 14_050,
      currency: 'CHF',
      method: 'bank_transfer',
      provider: null,
      reference: 'RF240810',
      note: 'Paiement final',
    }])

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"Date du mouvement";"Date du paiement"')
    expect(csv).toContain('"Encaissement";"Confirmé";"FAC-2026-0011"')
    expect(csv).toContain('"140,50";"CHF"')
    expect(csv.endsWith('\r\n')).toBe(true)
  })

  it('neutralizes spreadsheet formulas and escapes quotes', () => {
    const csv = buildAccountingCsv([{
      kind: 'checkout',
      status: 'expired',
      occurredAt: '2026-08-10T12:00:00.000Z',
      paidAt: null,
      invoiceNumber: '=HYPERLINK("https://invalid.example")',
      clientName: '+cmd',
      amountCents: 100,
      currency: 'CHF',
      method: 'twint',
      provider: 'stripe',
      reference: '@reference',
      note: '-test',
    }])

    expect(spreadsheetSafe(' =1+1')).toBe("' =1+1")
    expect(csv).toContain('"\'=HYPERLINK(""https://invalid.example"")"')
    expect(csv).toContain('"\'+cmd"')
    expect(csv).toContain('"\'@reference"')
    expect(csv).toContain('"\'-test"')
  })
})
