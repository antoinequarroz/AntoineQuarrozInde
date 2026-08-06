export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, message: error.message })
  const invoices = data ?? []
  if (!invoices.length) return []
  const ids = invoices.map(i => i.id)
  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('*')
      .eq('organization_id', org.id)
      .in('invoice_id', ids)
      .order('position', { ascending: true }),
    supabase
      .from('invoice_payments')
      .select('*')
      .eq('organization_id', org.id)
      .in('invoice_id', ids)
      .order('paid_at', { ascending: false }),
  ])
  const byInvoiceId = new Map<number, any[]>()
  for (const item of items ?? []) {
    const list = byInvoiceId.get(item.invoice_id) || []
    list.push(item)
    byInvoiceId.set(item.invoice_id, list)
  }
  const paymentsByInvoiceId = new Map<number, any[]>()
  for (const payment of payments ?? []) {
    const list = paymentsByInvoiceId.get(payment.invoice_id) || []
    list.push(payment)
    paymentsByInvoiceId.set(payment.invoice_id, list)
  }
  return invoices.map(invoice => ({
    ...invoice,
    items: byInvoiceId.get(invoice.id) || [],
    payments: paymentsByInvoiceId.get(invoice.id) || [],
  }))
})
