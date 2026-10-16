import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream, StandardFonts } from 'pdf-lib'
import { contractSnapshot, hashContractSnapshot } from '../server/utils/clientContract'
import { buildClientContractPdf } from '../server/utils/clientContractPdf'

const contract = {
  number: 'CTR-2026-0001', version: 1, title: 'Application métier', effective_date: '2026-10-01', starts_at: '2026-10-01', ends_at: null,
  scope: 'Créer une application métier.', deliverables: ['Cadrage', 'Application'], provider_obligations: 'Réaliser.', client_obligations: 'Valider.',
  payment_terms: 'Selon devis.', change_management: 'Accord écrit.', intellectual_property: 'Transfert après paiement.', confidentiality: 'Confidentiel.',
  data_protection: 'Droit applicable.', warranty_support: 'Correction des anomalies.', liability: 'Dommages directs.', termination: 'Notification écrite.',
  governing_law: 'Droit suisse', jurisdiction: 'Valais, Suisse', special_terms: '',
}
const organization = { name: 'Antoine Quarroz', billing_name: 'Antoine Quarroz', billing_city: 'Sion', billing_country: 'CH' }
const client = { name: 'Marie Exemple', company: 'Exemple SA', email: 'marie@example.ch', billing_city: 'Sierre', billing_country: 'CH' }

async function readPdfText(pdf: Uint8Array) {
  const doc = await PDFDocument.load(pdf)
  const pages = doc.getPages().map(page => {
    const contents = page.node.Contents()
    const streams = contents instanceof PDFArray ? contents.asArray().map(ref => doc.context.lookup(ref)) : [contents]
    const runs: Array<{ text: string, x: number, y: number, size: number, bold: boolean }> = []
    for (const stream of streams) {
      if (!(stream instanceof PDFRawStream)) continue
      const operators = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1')
      for (const match of operators.matchAll(/BT([\s\S]*?)ET/g)) {
        const block = match[1]!
        const position = block.match(/1 0 0 1 ([\d.-]+) ([\d.-]+) Tm/)
        const font = block.match(/\/(\S+) ([\d.]+) Tf/)
        const encoded = block.match(/<([a-f\d]+)> Tj/i)
        if (!position || !font || !encoded) continue
        runs.push({ text: new TextDecoder('windows-1252').decode(Buffer.from(encoded[1]!, 'hex')), x: Number(position[1]), y: Number(position[2]), size: Number(font[2]), bold: font[1]!.includes('Bold') })
      }
    }
    return runs
  })
  return { doc, pages }
}

describe('client contracts', () => {
  it('freezes deterministic client-visible terms with a SHA-256 fingerprint', () => {
    const snapshot = contractSnapshot(contract, organization, client)
    expect(hashContractSnapshot(snapshot)).toMatch(/^[a-f0-9]{64}$/)
    expect(hashContractSnapshot(snapshot)).toBe(hashContractSnapshot(structuredClone(snapshot)))
    expect(snapshot.contract.deliverables).toEqual(['Cadrage', 'Application'])
  })

  it('generates a readable multi-section PDF from the frozen snapshot', async () => {
    const pdf = await buildClientContractPdf(contractSnapshot(contract, organization, client))
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
    expect(pdf.length).toBeGreaterThan(2_000)
  })

  it('preserves every clause across pages and keeps long identifiers within the printable area', async () => {
    const identifier = `https://example.ch/${'identifiant'.repeat(50)}`
    const terms = { ...contract, title: 'Création d’un site web — projet de démonstration', scope: `${identifier}\n${'La prestation est définie dans le périmètre convenu. '.repeat(160)} FIN-DU-PERIMETRE`, special_terms: 'CONDITIONS-PARTICULIERES-CONSERVEES' }
    const snapshot = contractSnapshot(terms, organization, client)
    const before = structuredClone(snapshot)
    const { doc, pages } = await readPdfText(await buildClientContractPdf(snapshot))
    expect(snapshot).toEqual(before)
    expect(pages.length).toBeGreaterThan(2)
    const text = pages.flat().map(run => run.text).join('')
    expect(text).toContain(identifier)
    expect(text).toContain('FIN-DU-PERIMETRE')
    expect(text).toContain('CONDITIONS-PARTICULIERES-CONSERVEES')
    for (const value of [terms.provider_obligations, terms.client_obligations, terms.payment_terms, terms.change_management, terms.intellectual_property, terms.confidentiality, terms.data_protection, terms.warranty_support, terms.liability, terms.termination]) expect(text).toContain(value)
    const fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) }
    const margin = 18 * 72 / 25.4
    for (const runs of pages) {
      for (const run of runs) {
        expect(run.x).toBeGreaterThanOrEqual(margin - 0.1)
        expect(run.x + fonts[run.bold ? 'bold' : 'regular'].widthOfTextAtSize(run.text, run.size)).toBeLessThanOrEqual(595.28 - margin + 0.1)
        expect(run.y).toBeGreaterThanOrEqual(27)
      }
      const body = runs.filter(run => run.y > 62 && run.y < 730)
      for (let index = 0; index < body.length; index += 1) {
        if (/^(?:\d+\. |Droit applicable|Entre les parties|Livrables)/.test(body[index]!.text)) expect(body[index + 1], `Heading without following content: ${body[index]!.text}`).toBeDefined()
      }
    }
    const acceptance = pages.find(runs => runs.some(run => run.text === 'Acceptation'))!
    expect(acceptance.some(run => run.text === 'Pour le Prestataire')).toBe(true)
    expect(acceptance.some(run => run.text === 'Pour le Client')).toBe(true)
    expect(acceptance.filter(run => run.text === 'Lieu, date et signature')).toHaveLength(2)
  })

  it('uses the provider from the snapshot and keeps the recorded acceptance together', async () => {
    const provider = { ...organization, billing_name: 'Prestataire de démonstration SA' }
    const snapshot = contractSnapshot({ ...contract, scope: 'Une prestation complète. '.repeat(450) }, provider, client)
    const { pages } = await readPdfText(await buildClientContractPdf(snapshot, { name: 'Marie Exemple', email: `${'adresse'.repeat(30)}@example.ch`, signedAt: '2026-10-16T10:00:00.000Z' }))
    const text = pages.flat().map(run => run.text).join('')
    expect(text).not.toContain('Antoine Quarroz')
    expect(text).toContain(provider.billing_name)
    const acceptance = pages.find(runs => runs.some(run => run.text === 'Acceptation'))!
    expect(acceptance.some(run => run.text === 'Accepté par')).toBe(true)
    expect(acceptance.some(run => run.text === 'Adresse e-mail')).toBe(true)
    expect(acceptance.some(run => run.text === 'Date et heure')).toBe(true)
    expect(acceptance.map(run => run.text).join('')).toContain('16.10.2026 12:00:00')
  })

  it('keeps sent terms immutable and portal decisions auditable in the database', () => {
    const sql = readFileSync(new URL('../supabase/migrations/20260925182500_add_client_contracts.sql', import.meta.url), 'utf8')
    expect(sql).toContain("status in ('draft', 'sent', 'signed', 'declined', 'cancelled')")
    expect(sql).toContain('snapshot_hash')
    expect(sql).toContain('acceptance_ip')
    expect(sql).toContain('contracts_signature_complete')
  })
})
