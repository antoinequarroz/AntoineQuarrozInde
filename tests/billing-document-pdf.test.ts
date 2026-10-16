import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib'
import { buildBillingDocument } from '../server/utils/billingDocument'
import { buildBillingPdf } from '../server/utils/pdfBilling'

const { typst } = vi.hoisted(() => ({ typst: vi.fn() }))
vi.mock('../server/utils/typstBilling', () => ({ buildTypstBillingPdf: typst }))

const organization = { name: 'Prestataire Exemple', billing_iban: '' }
const client = { name: 'Client Exemple' }
const items = [{ label: 'Prestation', quantity: 1, unit_price_cents: 50_000, tax_rate: 0, total_cents: 50_000 }]
const document = { number: 'FAC-2026-0042', title: 'Création du site web', currency: 'CHF', status: 'draft', issued_at: '2026-10-16', due_at: '2026-11-16', subtotal_cents: 50_000, tax_cents: 0, total_cents: 50_000 }

async function pdfText(pdf: Uint8Array) {
  const doc = await PDFDocument.load(pdf)
  return doc.getPages().map(page => {
    const contents = page.node.Contents()
    const streams = contents instanceof PDFArray ? contents.asArray().map(ref => doc.context.lookup(ref)) : [contents]
    return streams.map(stream => {
      if (!(stream instanceof PDFRawStream)) return ''
      const operators = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1')
      return [...operators.matchAll(/<([a-f\d]+)> Tj/gi)].map(match => new TextDecoder('windows-1252').decode(Buffer.from(match[1]!, 'hex'))).join('\n')
    }).join('\n')
  }).join('\n')
}

afterEach(() => {
  typst.mockReset()
  vi.restoreAllMocks()
})

describe('client-visible billing PDFs', () => {
  it('retains the quote issue date and amounts without exposing its internal status or expiry', async () => {
    typst.mockResolvedValue(Buffer.from('%PDF-quote'))
    await buildBillingDocument({ kind: 'quote', document: { ...document, number: 'DEV-2026-0042', valid_until: '2026-10-30' }, organization, client, items })
    expect(typst).toHaveBeenCalledWith(expect.objectContaining({
      documentTitle: 'Devis', issuedAt: '2026-10-16', dueAt: '', statusLabel: '', totalCents: 50_000, taxCents: 0,
    }))
  })

  it('retains the explicit invoice deadline rather than calculating a different date', async () => {
    typst.mockResolvedValue(Buffer.from('%PDF-invoice'))
    await buildBillingDocument({ kind: 'invoice', document, organization, client, items })
    expect(typst).toHaveBeenCalledWith(expect.objectContaining({
      documentTitle: 'Facture', issuedAt: '2026-10-16', dueAt: '2026-11-16', statusLabel: '',
    }))
  })

  it('does not assign an issue date or deadline to a future balance invoice', async () => {
    typst.mockResolvedValue(Buffer.from('%PDF-balance'))
    await buildBillingDocument({ kind: 'invoice', document: { ...document, issued_at: null, due_at: null }, organization, client, items })
    expect(typst).toHaveBeenCalledWith(expect.objectContaining({ issuedAt: '', dueAt: '', statusLabel: '' }))
  })

  it('also removes quote expiry and internal status from a real fallback PDF', async () => {
    typst.mockRejectedValue(new Error('Typst unavailable'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await buildBillingDocument({ kind: 'quote', document: { ...document, valid_until: '2026-10-30' }, organization, client, items })
    expect(result.engine).toBe('pdf-lib-fallback')
    const text = await pdfText(result.pdf)
    expect(text).toContain('Date: 2026-10-16')
    expect(text).toContain('Total: 500.00 CHF')
    expect(text).not.toMatch(/Statut|Brouillon|draft|Echeance|2026-10-30/)
  })

  it('keeps the fallback free of status metadata and omits undated invoice fields', async () => {
    const input = {
      title: 'Facture', number: document.number, clientName: client.name, currency: 'CHF', status: 'Brouillon',
      issuedAt: null, dueAt: null, subtotalCents: 50_000, taxCents: 0, totalCents: 50_000,
      items: [{ label: 'Prestation', quantity: 1, unitPriceCents: 50_000, taxRate: 0, totalCents: 50_000 }],
    }
    const text = await pdfText(await buildBillingPdf(input))
    expect(text).toContain('Total: 500.00 CHF')
    expect(text).not.toMatch(/Statut|Brouillon|Date:|Echeance:/)
  })

  it('prints the invoice issue date and agreed deadline in the fallback as well', async () => {
    typst.mockRejectedValue(new Error('Typst unavailable'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await buildBillingDocument({ kind: 'invoice', document, organization, client, items })
    const text = await pdfText(result.pdf)
    expect(text).toContain('Date: 2026-10-16')
    expect(text).toContain('Echeance: 2026-11-16')
    expect(text).not.toMatch(/Statut|Brouillon|draft/)
  })
})
