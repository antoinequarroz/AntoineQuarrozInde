import type { Quote } from '~/types'

type QuoteRow = {
  id: number
  number: string
  client_id: number | null
  project_id?: number | null
  title: string
  amount_cents: number
  currency: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  issued_at: string | null
  valid_until: string | null
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

function mapQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    number: row.number,
    clientId: row.client_id,
    projectId: row.project_id ?? null,
    title: row.title,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    issuedAt: row.issued_at,
    validUntil: row.valid_until,
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

export const useQuotesStore = defineStore('quotes', () => {
  const auth = useAuthStore()
  const quotes = ref<Quote[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  const loadedContext = ref<string | null>(null)
  const loadingContext = ref<string | null>(null)
  let requestVersion = 0
  let activeLoad: Promise<void> | null = null
  function requestContext() {
    return `authenticated:${auth.userEmail ?? ''}:${auth.currentOrganizationId ?? ''}`
  }
  function ensureLoaded(force = false) {
    const context = requestContext()
    if (loading.value && loadingContext.value === context && activeLoad) return activeLoad
    if (loaded.value && loadedContext.value === context && !force) return Promise.resolve()
    const version = ++requestVersion
    loading.value = true
    loadingContext.value = context
    const load = (async () => {
      const rows = await $fetch<QuoteRow[]>('/api/quotes', { headers: auth.authHeader() })
      if (version !== requestVersion) return
      quotes.value = rows.map(mapQuote)
      loaded.value = true
      loadedContext.value = context
    })().finally(() => {
      if (version === requestVersion) {
        loading.value = false
        loadingContext.value = null
      }
      if (activeLoad === load) activeLoad = null
    })
    activeLoad = load
    return load
  }
  async function add(payload: Omit<Quote, 'id' | 'createdAt'>) {
    const row = await $fetch<QuoteRow>('/api/quotes', { method: 'POST', body: payload, headers: auth.authHeader() })
    quotes.value.unshift(mapQuote(row))
  }
  async function update(id: number, payload: Partial<Quote>) {
    const row = await $fetch<QuoteRow>('/api/quotes', { method: 'PUT', body: { ...payload, id }, headers: auth.authHeader() })
    const idx = quotes.value.findIndex(q => q.id === id)
    if (idx !== -1) quotes.value[idx] = mapQuote(row)
  }
  async function remove(id: number) {
    await $fetch('/api/quotes', { method: 'DELETE', query: { id }, headers: auth.authHeader() })
    quotes.value = quotes.value.filter(q => q.id !== id)
  }
  return { quotes, loaded, loading, ensureLoaded, add, update, remove }
})
