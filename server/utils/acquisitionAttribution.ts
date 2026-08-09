export type AttributionClient = {
  id: number
  status: string
  acquisition_source?: string | null
}

export type AttributionQuote = {
  client_id?: number | null
  status: string
  total_cents?: number | null
}

export type AttributionInvoice = {
  id: number
  client_id?: number | null
  document_type?: string | null
  status?: string | null
  total_cents?: number | null
}

export type AttributionPayment = {
  invoice_id: number
  amount_cents?: number | null
  voided_at?: string | null
}

export type AcquisitionAttributionRow = {
  source: string
  leads: number
  activeClients: number
  acceptedQuotes: number
  acceptedQuoteCents: number
  collectedRevenueCents: number
  leadToQuoteRate: number
}

function normalizeSource(value?: string | null) {
  const source = String(value || '').trim()
  if (!source) return 'Non attribué'
  if (source.toLowerCase() === 'direct') return 'Direct'
  return source
}

export function aggregateAcquisitionAttribution(
  clients: AttributionClient[],
  quotes: AttributionQuote[],
  invoices: AttributionInvoice[],
  payments: AttributionPayment[],
) {
  const rows = new Map<string, AcquisitionAttributionRow>()
  const clientSources = new Map<number, string>()
  const invoiceMeta = new Map<number, { clientId: number, status: string, totalCents: number }>()
  const paymentTotals = new Map<number, number>()
  const convertedClients = new Map<string, Set<number>>()

  const ensureRow = (source: string) => {
    const existing = rows.get(source)
    if (existing) return existing
    const row: AcquisitionAttributionRow = {
      source,
      leads: 0,
      activeClients: 0,
      acceptedQuotes: 0,
      acceptedQuoteCents: 0,
      collectedRevenueCents: 0,
      leadToQuoteRate: 0,
    }
    rows.set(source, row)
    return row
  }

  for (const client of clients) {
    const source = normalizeSource(client.acquisition_source)
    clientSources.set(Number(client.id), source)
    const row = ensureRow(source)
    row.leads += 1
    if (client.status === 'active') row.activeClients += 1
  }

  for (const quote of quotes) {
    if (quote.status !== 'accepted' || !quote.client_id) continue
    const source = clientSources.get(Number(quote.client_id))
    if (!source) continue
    const row = ensureRow(source)
    row.acceptedQuotes += 1
    row.acceptedQuoteCents += Math.max(0, Number(quote.total_cents || 0))
    const clientsForSource = convertedClients.get(source) || new Set<number>()
    clientsForSource.add(Number(quote.client_id))
    convertedClients.set(source, clientsForSource)
  }

  for (const invoice of invoices) {
    if (invoice.document_type === 'credit_note' || !invoice.client_id) continue
    invoiceMeta.set(Number(invoice.id), {
      clientId: Number(invoice.client_id),
      status: String(invoice.status || ''),
      totalCents: Math.max(0, Number(invoice.total_cents || 0)),
    })
  }

  for (const payment of payments) {
    if (payment.voided_at) continue
    const invoiceId = Number(payment.invoice_id)
    if (!invoiceMeta.has(invoiceId)) continue
    paymentTotals.set(invoiceId, (paymentTotals.get(invoiceId) || 0) + Math.max(0, Number(payment.amount_cents || 0)))
  }

  for (const [invoiceId, invoice] of invoiceMeta) {
    const source = clientSources.get(invoice.clientId)
    if (!source) continue
    const recordedPayments = paymentTotals.get(invoiceId) || 0
    const legacyPaidAmount = invoice.status === 'paid' && !recordedPayments ? invoice.totalCents : 0
    ensureRow(source).collectedRevenueCents += recordedPayments || legacyPaidAmount
  }

  const attribution = [...rows.values()]
    .map(row => ({
      ...row,
      leadToQuoteRate: row.leads ? Math.round((convertedClients.get(row.source)?.size || 0) / row.leads * 1_000) / 10 : 0,
    }))
    .sort((a, b) => b.collectedRevenueCents - a.collectedRevenueCents || b.acceptedQuoteCents - a.acceptedQuoteCents || b.leads - a.leads || a.source.localeCompare(b.source, 'fr'))

  return {
    attribution,
    commercialTotals: attribution.reduce((totals, row) => ({
      leads: totals.leads + row.leads,
      activeClients: totals.activeClients + row.activeClients,
      acceptedQuotes: totals.acceptedQuotes + row.acceptedQuotes,
      acceptedQuoteCents: totals.acceptedQuoteCents + row.acceptedQuoteCents,
      collectedRevenueCents: totals.collectedRevenueCents + row.collectedRevenueCents,
    }), { leads: 0, activeClients: 0, acceptedQuotes: 0, acceptedQuoteCents: 0, collectedRevenueCents: 0 }),
  }
}
