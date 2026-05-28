import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type PdfItem = {
  label: string
  quantity: number
  unitPriceCents: number
  taxRate: number
  totalCents?: number
}

type PdfDocData = {
  title: string
  number: string
  clientName: string
  currency: string
  issuedAt?: string | null
  dueAt?: string | null
  status?: string | null
  notes?: string | null
  subtotalCents: number
  taxCents: number
  totalCents: number
  items: PdfItem[]
}

export async function buildBillingPdf(data: PdfDocData) {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  let y = 800
  page.drawText(data.title, { x: 40, y, size: 20, font: bold, color: rgb(0.1, 0.1, 0.1) })
  y -= 28
  page.drawText(`Numero: ${data.number}`, { x: 40, y, size: 12, font: regular })
  y -= 18
  page.drawText(`Client: ${data.clientName}`, { x: 40, y, size: 12, font: regular })
  y -= 18
  if (data.issuedAt) { page.drawText(`Date: ${data.issuedAt}`, { x: 40, y, size: 11, font: regular }); y -= 16 }
  if (data.dueAt) { page.drawText(`Echeance: ${data.dueAt}`, { x: 40, y, size: 11, font: regular }); y -= 16 }
  if (data.status) { page.drawText(`Statut: ${data.status}`, { x: 40, y, size: 11, font: regular }); y -= 16 }

  y -= 10
  page.drawText('Lignes', { x: 40, y, size: 13, font: bold })
  y -= 20

  for (const item of data.items) {
    if (y < 120) break
    const qty = Number(item.quantity || 0)
    const unit = Number(item.unitPriceCents || 0)
    const total = item.totalCents ?? Math.round(qty * unit * (1 + (Number(item.taxRate || 0) / 100)))
    page.drawText(item.label, { x: 40, y, size: 10, font: regular })
    page.drawText(`${qty}`, { x: 290, y, size: 10, font: regular })
    page.drawText(`${(unit / 100).toFixed(2)} ${data.currency}`, { x: 340, y, size: 10, font: regular })
    page.drawText(`${(total / 100).toFixed(2)} ${data.currency}`, { x: 470, y, size: 10, font: regular })
    y -= 16
  }

  y -= 10
  page.drawText(`Sous-total: ${(data.subtotalCents / 100).toFixed(2)} ${data.currency}`, { x: 340, y, size: 11, font: regular })
  y -= 16
  page.drawText(`TVA: ${(data.taxCents / 100).toFixed(2)} ${data.currency}`, { x: 340, y, size: 11, font: regular })
  y -= 16
  page.drawText(`Total: ${(data.totalCents / 100).toFixed(2)} ${data.currency}`, { x: 340, y, size: 12, font: bold })

  if (data.notes) {
    y -= 30
    page.drawText('Notes:', { x: 40, y, size: 11, font: bold })
    y -= 14
    page.drawText(data.notes.slice(0, 400), { x: 40, y, size: 10, font: regular, maxWidth: 515, lineHeight: 12 })
  }

  return Buffer.from(await doc.save())
}
