import { buildBillingPdf } from './pdfBilling'
import { normalizeIban } from '../../shared/utils/swissQr'
import { buildTypstBillingPdf, type TypstBillingData } from './typstBilling'

type BillingDocumentInput = {
  kind: 'quote' | 'invoice'
  document: Record<string, any>
  organization: Record<string, any>
  client: Record<string, any> | null
  items: Array<Record<string, any>>
}

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  paid: 'Payé',
  overdue: 'En retard',
  cancelled: 'Annulé',
}

function partyFromOrganization(organization: Record<string, any>) {
  return {
    name: String(organization.billing_name || organization.name || ''),
    street: String(organization.billing_street || ''),
    building: String(organization.billing_building || ''),
    postalCode: String(organization.billing_postal_code || ''),
    city: String(organization.billing_city || ''),
    country: String(organization.billing_country || 'CH').toUpperCase(),
    email: String(organization.billing_email || ''),
    phone: String(organization.billing_phone || ''),
    uid: String(organization.billing_uid || ''),
  }
}

function partyFromClient(client: Record<string, any> | null) {
  return {
    name: String(client?.company || client?.name || ''),
    street: String(client?.billing_street || ''),
    building: String(client?.billing_building || ''),
    postalCode: String(client?.billing_postal_code || ''),
    city: String(client?.billing_city || ''),
    country: String(client?.billing_country || 'CH').toUpperCase(),
  }
}

export async function buildBillingDocument(input: BillingDocumentInput) {
  const { kind, document, organization, client, items } = input
  const currency = String(document.currency || 'CHF').toUpperCase()
  const iban = normalizeIban(String(organization.billing_iban || ''))
  const includeQr = kind === 'invoice' && Boolean(iban)
  const referenceType = String(document.payment_reference_type || 'NON') as 'NON' | 'SCOR' | 'QRR'
  const typstData: TypstBillingData = {
    documentTitle: kind === 'invoice' ? 'Facture' : 'Devis',
    number: String(document.number || ''),
    subject: String(document.title || ''),
    currency: currency === 'EUR' ? 'EUR' : 'CHF',
    issuedAt: String(document.issued_at || ''),
    dueAt: String(kind === 'invoice' ? document.due_at || '' : document.valid_until || ''),
    statusLabel: statusLabels[String(document.status)] || String(document.status || ''),
    notes: String(document.notes || ''),
    terms: String(organization.billing_terms || ''),
    subtotalCents: Number(document.subtotal_cents ?? document.amount_cents ?? 0),
    taxCents: Number(document.tax_cents ?? 0),
    totalCents: Number(document.total_cents ?? document.amount_cents ?? 0),
    issuer: partyFromOrganization(organization),
    client: partyFromClient(client),
    items: items.map(item => ({
      label: String(item.label || ''),
      description: String(item.description || ''),
      quantity: Number(item.quantity || 0),
      unitPriceCents: Number(item.unit_price_cents || 0),
      taxRate: Number(item.tax_rate || 0),
      totalCents: Number(item.total_cents || 0),
    })),
    includeQr,
    qr: {
      account: iban,
      referenceType,
      reference: document.payment_reference ? String(document.payment_reference) : null,
      additionalInfo: `${kind === 'invoice' ? 'Facture' : 'Devis'} ${String(document.number || '')}`,
    },
  }

  try {
    const pdf = await buildTypstBillingPdf(typstData)
    return { pdf: Buffer.from(pdf), engine: 'typst' as const }
  }
  catch (error) {
    console.warn('[billing-pdf] Typst unavailable or data incomplete, using pdf-lib fallback', error)
    const pdf = await buildBillingPdf({
      title: typstData.documentTitle,
      number: typstData.number,
      clientName: typstData.client.name || '-',
      currency: typstData.currency,
      issuedAt: document.issued_at,
      dueAt: kind === 'invoice' ? document.due_at : document.valid_until,
      status: typstData.statusLabel,
      notes: typstData.notes,
      subtotalCents: typstData.subtotalCents,
      taxCents: typstData.taxCents,
      totalCents: typstData.totalCents,
      items: typstData.items,
    })
    return { pdf, engine: 'pdf-lib-fallback' as const }
  }
}
