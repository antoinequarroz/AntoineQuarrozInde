import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

const mm = (value: number) => value * 72 / 25.4
const PAGE = { width: 595.28, height: 841.89, margin: mm(18), bottom: 62 }
const COLORS = {
  brand: rgb(124 / 255, 58 / 255, 237 / 255),
  ink: rgb(17 / 255, 24 / 255, 39 / 255),
  quiet: rgb(95 / 255, 100 / 255, 114 / 255),
  rule: rgb(229 / 255, 231 / 255, 235 / 255),
  paper: rgb(247 / 255, 248 / 255, 255 / 255),
}

function safe(value: unknown) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\r\n?/g, '\n')
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = []
  for (const paragraph of safe(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) { lines.push(''); continue }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue }
      if (line) { lines.push(line); line = '' }
      // URLs and identifiers also have to fit inside the printable area.
      for (const character of Array.from(word)) {
        if (line && font.widthOfTextAtSize(line + character, size) > width) {
          lines.push(line)
          line = ''
        }
        line += character
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

export async function buildClientContractPdf(data: Record<string, any>, signature?: { name?: string, email?: string, signedAt?: string } | null) {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const width = PAGE.width - PAGE.margin * 2
  const provider = data.provider || {}
  const client = data.client || {}
  const contract = data.contract
  const reference = `${safe(contract.number)} · version ${contract.version}`
  doc.setTitle(`Contrat ${safe(contract.number)}`)
  doc.setAuthor(safe(provider.name))
  doc.setSubject(safe(contract.title))
  // addPage(true) initializes the first page before any content is drawn.
  let page!: PDFPage
  let y = 0

  function text(value: unknown, x: number, baseline: number, size = 9.5, font = regular, color = COLORS.ink) {
    page.drawText(safe(value), { x, y: baseline, size, font, color })
  }

  function badge(x: number, top: number, size: number) {
    const radius = size * 2 / 9
    const bottom = top - size
    page.drawRectangle({ x: x + radius, y: bottom, width: size - radius * 2, height: size, color: COLORS.brand })
    page.drawRectangle({ x, y: bottom + radius, width: size, height: size - radius * 2, color: COLORS.brand })
    for (const cx of [x + radius, x + size - radius]) {
      for (const cy of [bottom + radius, top - radius]) page.drawCircle({ x: cx, y: cy, size: radius, color: COLORS.brand })
    }
    const fontSize = size * 10 / 51
    text('AQ', x + (size - bold.widthOfTextAtSize('AQ', fontSize)) / 2, bottom + (size - fontSize) / 2 + 2, fontSize, bold, rgb(1, 1, 1))
  }

  function addPage(first = false) {
    page = doc.addPage([PAGE.width, PAGE.height])
    const top = PAGE.height - PAGE.margin
    if (first) {
      badge(PAGE.margin, top, mm(18))
      const providerLines = [
        provider.name,
        [provider.street, provider.building].filter(Boolean).join(' '),
        [provider.postalCode, provider.city].filter(Boolean).join(' '),
        provider.country,
        provider.email,
        provider.phone,
        provider.uid ? `IDE/TVA ${provider.uid}` : '',
      ].filter(Boolean).flatMap(value => wrap(value, regular, 9, mm(62)))
      for (let index = 0; index < providerLines.length; index += 1) {
        text(providerLines[index], PAGE.width - PAGE.margin - mm(62), top - 9 - index * 12, 9)
      }
      y = top - Math.max(mm(18), providerLines.length * 12) - 28
    }
    else {
      badge(PAGE.margin, top, 26)
      const providerLines = wrap(provider.name || '', bold, 8.5, width * 0.4)
      for (let index = 0; index < providerLines.length; index += 1) text(providerLines[index], PAGE.margin + 36, top - 11 - index * 11, 8.5, bold)
      const referenceLines = wrap(`Contrat ${reference}`, regular, 8, width * 0.52)
      for (let index = 0; index < referenceLines.length; index += 1) {
        const line = referenceLines[index]!
        text(line, PAGE.width - PAGE.margin - regular.widthOfTextAtSize(line, 8), top - 11 - index * 11, 8, regular, COLORS.quiet)
      }
      y = top - Math.max(26, referenceLines.length * 11, providerLines.length * 11) - 13
      page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: 0.5, color: COLORS.rule })
      y -= 25
    }
  }

  function ensure(height: number) {
    if (y - height < PAGE.bottom) addPage()
  }

  function paragraph(value: unknown, options: { size?: number, indent?: number, bullet?: boolean, strong?: boolean, after?: number, color?: typeof COLORS.ink } = {}) {
    const size = options.size || 9.5
    const leading = size + 4
    const font = options.strong ? bold : regular
    const indent = options.indent || 0
    const bulletWidth = options.bullet ? 12 : 0
    const lines = wrap(String(value || ''), font, size, width - indent - bulletWidth)
    ensure(Math.min(lines.length, 2) * leading)
    for (let index = 0; index < lines.length; index += 1) {
      // Keep the last two lines together when a paragraph crosses a page.
      ensure((lines.length - index === 2 ? 2 : 1) * leading)
      if (options.bullet && index === 0) page.drawCircle({ x: PAGE.margin + indent + 3, y: y + 3, size: 1.7, color: COLORS.brand })
      text(lines[index] || ' ', PAGE.margin + indent + bulletWidth, y, size, font, options.color || COLORS.ink)
      y -= leading
    }
    y -= options.after ?? 8
  }

  function heading(title: string, followingLines = 2) {
    const lines = wrap(title, bold, 11.5, width)
    ensure(8 + lines.length * 15 + 9 + followingLines * 13.5)
    y -= 8
    for (const line of lines) { text(line, PAGE.margin, y, 11.5, bold, COLORS.brand); y -= 15 }
    y -= 5
  }

  function labelValue(label: string, value: unknown) {
    if (!value) return
    const lines = wrap(String(value), regular, 9.5, width - 110)
    ensure(lines.length * 13.5 + 5)
    text(label, PAGE.margin, y, 8.5, bold, COLORS.quiet)
    for (const line of lines) { text(line, PAGE.margin + 110, y); y -= 13.5 }
    y -= 5
  }

  addPage(true)
  paragraph('Contrat de prestation de services', { size: 17, strong: true, after: 6 })
  paragraph(`N° ${reference}`, { size: 10, strong: true, color: COLORS.brand, after: 15 })
  paragraph(contract.title, { size: 12, strong: true, after: 13 })

  const effectiveDate = contract.effectiveDate || 'À la date de signature'
  const period = [contract.startsAt, contract.endsAt].filter(Boolean).join(' au ') || 'Selon le calendrier convenu'
  const metadata: Array<[string, string]> = []
  if (contract.issuedAt) {
    const issuedDate = new Date(`${contract.issuedAt}T12:00:00.000Z`)
    if (!Number.isNaN(issuedDate.getTime())) metadata.push(['Date du contrat', new Intl.DateTimeFormat('fr-CH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich' }).format(issuedDate)])
  }
  metadata.push(['Entrée en vigueur', effectiveDate], ['Période', period])
  const metadataHeight = metadata.reduce((height, [, value]) => height + wrap(value, regular, 9.5, width - 134).length * 13.5 + 5, 14)
  ensure(metadataHeight + 14)
  page.drawRectangle({ x: PAGE.margin, y: y - metadataHeight + 11, width, height: metadataHeight, color: COLORS.paper })
  y -= 5
  for (const [label, value] of metadata) {
    text(label, PAGE.margin + 12, y, 8.5, bold, COLORS.quiet)
    for (const line of wrap(value!, regular, 9.5, width - 134)) { text(line, PAGE.margin + 122, y); y -= 13.5 }
    y -= 5
  }
  y -= 18

  heading('Entre les parties')
  paragraph(`${provider.name}${provider.uid ? ` (${provider.uid})` : ''}, ${[provider.street, provider.building, provider.postalCode, provider.city, provider.country].filter(Boolean).join(' ')}, ci-après « le Prestataire ».`)
  paragraph(`${client.company || client.name}, représenté par ${client.name}, ${[client.street, client.building, client.postalCode, client.city, client.country].filter(Boolean).join(' ')}, ci-après « le Client ».`)

  heading('Livrables')
  for (const item of contract.deliverables || []) paragraph(item, { bullet: true, indent: 4, after: 5 })
  const sections: Array<[string, unknown]> = [
    ['1. Objet et périmètre', contract.scope],
    ['2. Obligations du Prestataire', contract.providerObligations],
    ['3. Obligations du Client', contract.clientObligations],
    ['4. Prix et paiement', contract.paymentTerms],
    ['5. Modifications du périmètre', contract.changeManagement],
    ['6. Propriété intellectuelle', contract.intellectualProperty],
    ['7. Confidentialité', contract.confidentiality],
    ['8. Protection des données', contract.dataProtection],
    ['9. Garantie et support', contract.warrantySupport],
    ['10. Responsabilité', contract.liability],
    ['11. Durée et résiliation', contract.termination],
  ]
  for (const [title, content] of sections) { heading(title); paragraph(content) }
  if (contract.specialTerms) { heading('12. Conditions particulières'); paragraph(contract.specialTerms) }
  heading('Droit applicable et for')
  paragraph(`Le contrat est soumis au ${contract.governingLaw}. Le for convenu est ${contract.jurisdiction}, sous réserve des fors impératifs.`)

  const acceptance = 'Les parties confirment avoir lu et compris le présent contrat. L’acceptation enregistrée dans l’espace client est liée à cette version figée du document.'
  const acceptanceHeight = wrap(acceptance, regular, 9.5, width).length * 13.5 + 8
  if (signature?.signedAt) {
    const rows = [
      ['Accepté par', signature.name || client.name],
      ['Adresse e-mail', signature.email],
      ['Date et heure', new Date(signature.signedAt).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich' })],
    ]
    const rowsHeight = rows.filter(([, value]) => value).reduce((height, [, value]) => height + wrap(String(value), regular, 9.5, width - 110).length * 13.5 + 5, 0)
    ensure(37 + acceptanceHeight + rowsHeight)
    heading('Acceptation', 0)
    paragraph(acceptance)
    for (const [label, value] of rows) labelValue(label!, value)
  }
  else {
    const signatureColumnWidth = (width - 28) / 2
    const providerLines = wrap(provider.name || '', regular, 9.5, signatureColumnWidth)
    const clientLines = wrap(client.name || '', regular, 9.5, signatureColumnWidth)
    const namesHeight = Math.max(providerLines.length, clientLines.length) * 13.5
    ensure(37 + acceptanceHeight + namesHeight + 92)
    heading('Acceptation', 0)
    paragraph(acceptance)
    y -= 4
    for (const [column, label, lines] of [[0, 'Pour le Prestataire', providerLines], [1, 'Pour le Client', clientLines]] as const) {
      const x = PAGE.margin + column * (signatureColumnWidth + 28)
      text(label, x, y, 8.5, bold, COLORS.quiet)
      for (let index = 0; index < lines.length; index += 1) text(lines[index], x, y - 19 - index * 13.5)
      text('Lieu, date et signature', x, y - namesHeight - 35, 8, regular, COLORS.quiet)
      page.drawLine({ start: { x, y: y - namesHeight - 72 }, end: { x: x + signatureColumnWidth, y: y - namesHeight - 72 }, thickness: 0.6, color: COLORS.rule })
    }
    y -= namesHeight + 82
  }

  const pages = doc.getPages()
  for (let index = 0; index < pages.length; index += 1) {
    page = pages[index]!
    page.drawLine({ start: { x: PAGE.margin, y: 42 }, end: { x: PAGE.width - PAGE.margin, y: 42 }, thickness: 0.5, color: COLORS.rule })
    const footerName = wrap(provider.name || '', regular, 8, width * 0.65)[0] || ''
    text(footerName, PAGE.margin, 27, 8, regular, COLORS.quiet)
    const pagination = `Page ${index + 1} / ${pages.length}`
    text(pagination, PAGE.width - PAGE.margin - regular.widthOfTextAtSize(pagination, 8), 27, 8, regular, COLORS.quiet)
  }
  return Buffer.from(await doc.save())
}
