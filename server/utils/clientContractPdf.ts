import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

const PAGE = { width: 595.28, height: 841.89, margin: 52 }
const navy = rgb(0.055, 0.071, 0.13)
const copper = rgb(0.72, 0.43, 0.22)
const muted = rgb(0.36, 0.39, 0.45)

function safe(value: unknown) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = []
  for (const paragraph of safe(text).split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) { lines.push(''); continue }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate
      else { if (line) lines.push(line); line = word }
    }
    if (line) lines.push(line)
  }
  return lines
}

export async function buildClientContractPdf(data: Record<string, any>, signature?: { name?: string, email?: string, signedAt?: string } | null) {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  let page: PDFPage
  let y = 0
  let pageNumber = 0

  function addPage() {
    page = doc.addPage([PAGE.width, PAGE.height])
    pageNumber += 1
    y = PAGE.height - PAGE.margin
    page.drawText('ANTOINE QUARROZ', { x: PAGE.margin, y, size: 8, font: bold, color: copper })
    page.drawText(`CONTRAT ${safe(data.contract.number)} - V${data.contract.version}`, { x: PAGE.width - PAGE.margin - 180, y, size: 8, font: bold, color: muted })
    page.drawLine({ start: { x: PAGE.margin, y: y - 10 }, end: { x: PAGE.width - PAGE.margin, y: y - 10 }, thickness: 0.8, color: rgb(0.86, 0.87, 0.9) })
    y -= 35
  }

  function ensure(height: number) {
    if (y - height < 58) addPage()
  }

  function heading(title: string, level = 2) {
    const size = level === 1 ? 22 : 12
    ensure(size + 20)
    if (level === 2) page.drawRectangle({ x: PAGE.margin, y: y - 2, width: 3, height: size + 3, color: copper })
    page.drawText(safe(title), { x: PAGE.margin + (level === 2 ? 12 : 0), y, size, font: bold, color: navy })
    y -= size + (level === 1 ? 18 : 11)
  }

  function paragraph(value: unknown, options: { size?: number, indent?: number, bullet?: boolean } = {}) {
    const size = options.size || 9.5
    const indent = options.indent || 0
    const x = PAGE.margin + indent
    const maxWidth = PAGE.width - PAGE.margin * 2 - indent
    const lines = wrap(String(value || ''), regular, size, maxWidth - (options.bullet ? 12 : 0))
    for (let index = 0; index < lines.length; index += 1) {
      ensure(size + 5)
      if (options.bullet && index === 0) page.drawCircle({ x: x + 3, y: y + 3, size: 1.8, color: copper })
      page.drawText(lines[index] || ' ', { x: x + (options.bullet ? 12 : 0), y, size, font: regular, color: navy })
      y -= size + 4
    }
    y -= 4
  }

  function labelValue(label: string, value: unknown) {
    if (!value) return
    ensure(18)
    page.drawText(safe(label), { x: PAGE.margin, y, size: 8.5, font: bold, color: muted })
    page.drawText(safe(value), { x: PAGE.margin + 105, y, size: 9, font: regular, color: navy })
    y -= 16
  }

  addPage()
  heading('Contrat de prestation de services', 1)
  paragraph(data.contract.title, { size: 13 })
  labelValue('Référence', `${data.contract.number} · version ${data.contract.version}`)
  labelValue('Entrée en vigueur', data.contract.effectiveDate || 'À la date de signature')
  labelValue('Période', [data.contract.startsAt, data.contract.endsAt].filter(Boolean).join(' au ') || 'Selon le calendrier convenu')
  y -= 10

  heading('Entre les parties')
  paragraph(`${data.provider.name}${data.provider.uid ? ` (${data.provider.uid})` : ''}, ${[data.provider.street, data.provider.building, data.provider.postalCode, data.provider.city, data.provider.country].filter(Boolean).join(' ')}, ci-après « le Prestataire ».`)
  paragraph(`${data.client.company || data.client.name}, représenté par ${data.client.name}, ${[data.client.street, data.client.building, data.client.postalCode, data.client.city, data.client.country].filter(Boolean).join(' ')}, ci-après « le Client ».`)

  const sections: Array<[string, unknown]> = [
    ['1. Objet et périmètre', data.contract.scope],
    ['2. Obligations du Prestataire', data.contract.providerObligations],
    ['3. Obligations du Client', data.contract.clientObligations],
    ['4. Prix et paiement', data.contract.paymentTerms],
    ['5. Modifications du périmètre', data.contract.changeManagement],
    ['6. Propriété intellectuelle', data.contract.intellectualProperty],
    ['7. Confidentialité', data.contract.confidentiality],
    ['8. Protection des données', data.contract.dataProtection],
    ['9. Garantie et support', data.contract.warrantySupport],
    ['10. Responsabilité', data.contract.liability],
    ['11. Durée et résiliation', data.contract.termination],
  ]

  heading('Livrables')
  for (const item of data.contract.deliverables || []) paragraph(item, { bullet: true, indent: 4 })
  for (const [title, content] of sections) { heading(title); paragraph(content) }
  if (data.contract.specialTerms) { heading('12. Conditions particulières'); paragraph(data.contract.specialTerms) }
  heading('Droit applicable et for')
  paragraph(`Le contrat est soumis au ${data.contract.governingLaw}. Le for convenu est ${data.contract.jurisdiction}, sous réserve des fors impératifs.`)

  heading('Acceptation')
  paragraph('Les parties confirment avoir lu et compris le présent contrat. L’acceptation enregistrée dans l’espace client est liée à cette version figée du document.')
  if (signature?.signedAt) {
    labelValue('Accepté par', signature.name || data.client.name)
    labelValue('Adresse e-mail', signature.email)
    labelValue('Date et heure', new Date(signature.signedAt).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich' }))
  } else {
    y -= 8
    labelValue('Pour le Prestataire', 'Antoine Quarroz')
    labelValue('Pour le Client', 'Nom, date et signature')
  }

  const pages = doc.getPages()
  for (let index = 0; index < pages.length; index += 1) {
    const current = pages[index]!
    current.drawLine({ start: { x: PAGE.margin, y: 42 }, end: { x: PAGE.width - PAGE.margin, y: 42 }, thickness: 0.5, color: rgb(0.86, 0.87, 0.9) })
    current.drawText(`Document contractuel · ${safe(data.contract.number)} · page ${index + 1}/${pages.length}`, { x: PAGE.margin, y: 27, size: 7.5, font: regular, color: muted })
  }
  return Buffer.from(await doc.save())
}
