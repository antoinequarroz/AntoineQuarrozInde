type CandidateClient = { id: number, name: string, company?: string | null }
type CandidateInvoice = { id: number, client_id?: number | null, number: string, total_cents?: number | null, amount_cents?: number | null, currency: string, payment_reference?: string | null }
type CandidatePayment = { invoice_id: number, amount_cents: number, voided_at?: string | null }

export function buildReconciliationCandidates(input: { clients: CandidateClient[], invoices: CandidateInvoice[], payments: CandidatePayment[] }) {
  const clientsById = new Map(input.clients.map(client => [Number(client.id), client]))
  const paidByInvoice = new Map<number, number>()
  for (const payment of input.payments) {
    if (payment.voided_at) continue
    const invoiceId = Number(payment.invoice_id)
    paidByInvoice.set(invoiceId, (paidByInvoice.get(invoiceId) || 0) + Number(payment.amount_cents || 0))
  }
  return input.invoices.map((invoice) => {
    const client = clientsById.get(Number(invoice.client_id))
    const totalCents = Number(invoice.total_cents ?? invoice.amount_cents ?? 0)
    return {
      id: Number(invoice.id),
      number: invoice.number,
      clientName: client?.company || client?.name || 'Client non renseigné',
      balanceCents: Math.max(0, totalCents - (paidByInvoice.get(Number(invoice.id)) || 0)),
      currency: invoice.currency,
      paymentReference: invoice.payment_reference || null,
    }
  }).filter(invoice => invoice.balanceCents > 0)
}
