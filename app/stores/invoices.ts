import type { Invoice, InvoicePayment } from '~/types'

type InvoiceRow = {
  id: number
  number: string
  client_id: number | null
  quote_id: number | null
  project_id?: number | null
  amount_cents: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issued_at: string | null
  due_at: string | null
  paid_at: string | null
  notes: string | null
  document_type?: 'invoice' | 'credit_note'
  credited_invoice_id?: number | null
  locked_at?: string | null
  payment_reference_type?: 'NON' | 'SCOR' | 'QRR'
  payment_reference?: string | null
  subtotal_cents?: number
  tax_cents?: number
  total_cents?: number
  items?: Array<{
    id: number
    label: string
    description: string | null
    quantity: number
    unit_price_cents: number
    tax_rate: number
    total_cents: number
  }>
  payments?: Array<{
    id: number
    invoice_id: number
    amount_cents: number
    currency: string
    method: InvoicePayment['method']
    paid_at: string
    reference: string | null
    notes: string | null
    provider?: 'stripe' | null
    provider_payment_id?: string | null
    voided_at: string | null
    void_reason: string | null
    created_at: string
  }>
  created_at: string
  reminders_paused?: boolean
}

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    number: row.number,
    clientId: row.client_id,
    quoteId: row.quote_id,
    projectId: row.project_id ?? null,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    issuedAt: row.issued_at,
    dueAt: row.due_at,
    paidAt: row.paid_at,
    notes: row.notes,
    documentType: row.document_type || 'invoice',
    creditedInvoiceId: row.credited_invoice_id || null,
    lockedAt: row.locked_at || null,
    paymentReferenceType: row.payment_reference_type || 'NON',
    paymentReference: row.payment_reference || null,
    subtotalCents: row.subtotal_cents ?? row.amount_cents,
    taxCents: row.tax_cents ?? 0,
    totalCents: row.total_cents ?? row.amount_cents,
    items: (row.items || []).map(item => ({
      id: item.id,
      label: item.label,
      description: item.description,
      quantity: Number(item.quantity),
      unitPriceCents: item.unit_price_cents,
      taxRate: Number(item.tax_rate),
      totalCents: item.total_cents,
    })),
    payments: (row.payments || []).map(payment => ({
      id: payment.id,
      invoiceId: payment.invoice_id,
      amountCents: payment.amount_cents,
      currency: payment.currency,
      method: payment.method,
      paidAt: payment.paid_at,
      reference: payment.reference,
      notes: payment.notes,
      provider: payment.provider ?? null,
      providerPaymentId: payment.provider_payment_id ?? null,
      voidedAt: payment.voided_at,
      voidReason: payment.void_reason,
      createdAt: payment.created_at,
    })),
    paidAmountCents: (row.payments || []).reduce((sum, payment) => sum + (payment.voided_at ? 0 : payment.amount_cents), 0),
    remindersPaused: Boolean(row.reminders_paused),
    createdAt: row.created_at?.slice(0, 10) ?? '',
  }
}

export const useInvoicesStore = defineStore('invoices', () => {
  const auth = useAuthStore()
  const invoices = ref<Invoice[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  async function ensureLoaded(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const rows = await $fetch<InvoiceRow[]>('/api/invoices', { headers: auth.authHeader() })
      invoices.value = rows.map(mapInvoice)
      loaded.value = true
    } finally {
      loading.value = false
    }
  }
  async function add(payload: Omit<Invoice, 'id' | 'createdAt'>) {
    const row = await $fetch<InvoiceRow>('/api/invoices', { method: 'POST', body: payload, headers: auth.authHeader() })
    const invoice = mapInvoice(row)
    invoices.value.unshift(invoice)
    return invoice
  }
  async function update(id: number, payload: Partial<Invoice>) {
    const row = await $fetch<InvoiceRow>('/api/invoices', { method: 'PUT', body: { ...payload, id }, headers: auth.authHeader() })
    const invoice = mapInvoice(row)
    const idx = invoices.value.findIndex(q => q.id === id)
    if (idx !== -1) invoices.value[idx] = invoice
    return invoice
  }
  async function remove(id: number) {
    await $fetch('/api/invoices', { method: 'DELETE', query: { id }, headers: auth.authHeader() })
    invoices.value = invoices.value.filter(q => q.id !== id)
  }
  return { invoices, loaded, loading, ensureLoaded, add, update, remove }
})
