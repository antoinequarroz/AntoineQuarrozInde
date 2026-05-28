import type { Invoice } from '~/types'

type InvoiceRow = {
  id: number
  number: string
  client_id: number | null
  quote_id: number | null
  amount_cents: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issued_at: string | null
  due_at: string | null
  paid_at: string | null
  notes: string | null
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
  created_at: string
}

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    number: row.number,
    clientId: row.client_id,
    quoteId: row.quote_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    issuedAt: row.issued_at,
    dueAt: row.due_at,
    paidAt: row.paid_at,
    notes: row.notes,
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
    invoices.value.unshift(mapInvoice(row))
  }
  async function update(id: number, payload: Partial<Invoice>) {
    const row = await $fetch<InvoiceRow>('/api/invoices', { method: 'PUT', body: { ...payload, id }, headers: auth.authHeader() })
    const idx = invoices.value.findIndex(q => q.id === id)
    if (idx !== -1) invoices.value[idx] = mapInvoice(row)
  }
  async function remove(id: number) {
    await $fetch('/api/invoices', { method: 'DELETE', query: { id }, headers: auth.authHeader() })
    invoices.value = invoices.value.filter(q => q.id !== id)
  }
  return { invoices, loaded, loading, ensureLoaded, add, update, remove }
})
