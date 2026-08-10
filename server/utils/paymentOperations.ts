type PaymentClient = {
  id: number
  name: string
  company?: string | null
}

type PaymentInvoice = {
  id: number
  client_id?: number | null
  number: string
  total_cents?: number | null
  amount_cents?: number | null
  currency: string
  status: string
  document_type?: string | null
  issued_at?: string | null
  due_at?: string | null
}

type InvoicePayment = {
  id: number
  invoice_id: number
  amount_cents: number
  currency: string
  method: string
  paid_at: string
  reference?: string | null
  provider?: string | null
  voided_at?: string | null
  void_reason?: string | null
  created_at?: string | null
}

type CheckoutSession = {
  id: number
  invoice_id: number
  client_id: number
  provider: string
  provider_session_id: string
  amount_cents: number
  currency: string
  status: string
  expires_at: string
  completed_at?: string | null
  created_at: string
}

type PaymentOperationsInput = {
  clients: PaymentClient[]
  invoices: PaymentInvoice[]
  payments: InvoicePayment[]
  sessions: CheckoutSession[]
  now?: Date
}

function cents(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0
}

function invoiceTotal(invoice: PaymentInvoice) {
  return cents(invoice.total_cents ?? invoice.amount_cents)
}

export function buildPaymentOperations(input: PaymentOperationsInput) {
  const now = input.now || new Date()
  const nowIso = now.toISOString()
  const monthPrefix = nowIso.slice(0, 7)
  const clientsById = new Map(input.clients.map(client => [Number(client.id), client]))
  const invoicesById = new Map(input.invoices.map(invoice => [Number(invoice.id), invoice]))
  const activePayments = input.payments.filter(payment => !payment.voided_at && invoicesById.get(Number(payment.invoice_id))?.document_type !== 'credit_note')

  const paidByInvoice = new Map<number, number>()
  for (const payment of activePayments) {
    const invoiceId = Number(payment.invoice_id)
    paidByInvoice.set(invoiceId, (paidByInvoice.get(invoiceId) || 0) + cents(payment.amount_cents))
  }

  const openInvoices = input.invoices.filter(invoice => invoice.document_type !== 'credit_note' && ['sent', 'overdue'].includes(invoice.status))
  const invoiceBalance = (invoice: PaymentInvoice) => Math.max(0, invoiceTotal(invoice) - (paidByInvoice.get(Number(invoice.id)) || 0))
  const outstandingCents = openInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0)
  const overdueCents = openInvoices.filter(invoice => invoice.status === 'overdue').reduce((sum, invoice) => sum + invoiceBalance(invoice), 0)
  const collectedCents = activePayments.reduce((sum, payment) => sum + cents(payment.amount_cents), 0)
  const collectedThisMonthCents = activePayments
    .filter(payment => String(payment.paid_at || '').startsWith(monthPrefix))
    .reduce((sum, payment) => sum + cents(payment.amount_cents), 0)

  const staleSessions = input.sessions.filter(session => session.status === 'created' && session.expires_at <= nowIso)
  const activeSessions = input.sessions.filter(session => session.status === 'created' && session.expires_at > nowIso)

  const alerts = [
    ...openInvoices.filter(invoice => invoice.status === 'overdue' && invoiceBalance(invoice) > 0).map(invoice => {
      const client = clientsById.get(Number(invoice.client_id))
      return {
        id: `overdue-${invoice.id}`,
        kind: 'overdue_invoice',
        tone: 'critical',
        title: `Facture ${invoice.number} en retard`,
        detail: client?.company || client?.name || 'Client non renseigné',
        amountCents: invoiceBalance(invoice),
        currency: invoice.currency,
        invoiceId: invoice.id,
      }
    }),
    ...staleSessions.map(session => {
      const invoice = invoicesById.get(Number(session.invoice_id))
      const client = clientsById.get(Number(session.client_id))
      return {
        id: `stale-session-${session.id}`,
        kind: 'stale_checkout',
        tone: 'warning',
        title: `Session TWINT à contrôler${invoice ? ` · ${invoice.number}` : ''}`,
        detail: client?.company || client?.name || 'Client non renseigné',
        amountCents: cents(session.amount_cents),
        currency: session.currency,
        invoiceId: session.invoice_id,
      }
    }),
  ]

  const paymentEntries = input.payments.map(payment => {
    const invoice = invoicesById.get(Number(payment.invoice_id))
    const client = invoice ? clientsById.get(Number(invoice.client_id)) : undefined
    return {
      id: `payment-${payment.id}`,
      kind: 'payment',
      status: payment.voided_at ? 'voided' : 'confirmed',
      occurredAt: payment.created_at || `${payment.paid_at}T12:00:00.000Z`,
      paidAt: payment.paid_at,
      invoiceId: payment.invoice_id,
      invoiceNumber: invoice?.number || `Facture #${payment.invoice_id}`,
      clientName: client?.company || client?.name || 'Client non renseigné',
      amountCents: cents(payment.amount_cents),
      currency: payment.currency,
      method: payment.method,
      provider: payment.provider || null,
      reference: payment.reference || null,
      note: payment.voided_at ? payment.void_reason || 'Écriture annulée' : null,
    }
  })

  const checkoutEntries = input.sessions.filter(session => session.status !== 'completed').map(session => {
    const invoice = invoicesById.get(Number(session.invoice_id))
    const client = clientsById.get(Number(session.client_id))
    const effectiveStatus = session.status === 'created' && session.expires_at <= nowIso ? 'expired' : session.status
    return {
      id: `checkout-${session.id}`,
      kind: 'checkout',
      status: effectiveStatus === 'created' ? 'open' : effectiveStatus,
      occurredAt: session.created_at,
      paidAt: null,
      invoiceId: session.invoice_id,
      invoiceNumber: invoice?.number || `Facture #${session.invoice_id}`,
      clientName: client?.company || client?.name || 'Client non renseigné',
      amountCents: cents(session.amount_cents),
      currency: session.currency,
      method: 'twint',
      provider: session.provider,
      reference: session.provider_session_id,
      note: effectiveStatus === 'expired' ? 'Session expirée sans encaissement' : 'Checkout ouvert, paiement non confirmé',
    }
  })

  return {
    generatedAt: nowIso,
    metrics: {
      collectedCents,
      collectedThisMonthCents,
      outstandingCents,
      overdueCents,
      activeSessions: activeSessions.length,
      attentionCount: alerts.length,
    },
    alerts,
    entries: [...paymentEntries, ...checkoutEntries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  }
}
