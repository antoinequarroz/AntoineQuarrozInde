import { buildReconciliationCandidates } from '../../utils/paymentReconciliation'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const { data: invoices, error: invoiceError } = await supabase
    .from('invoices')
    .select('id,client_id,number,total_cents,amount_cents,currency,payment_reference')
    .eq('organization_id', org.id)
    .in('status', ['sent', 'overdue'])
    .neq('document_type', 'credit_note')
  if (invoiceError) throw createError({ statusCode: 500, message: 'Les factures rapprochables sont indisponibles.' })
  if (!invoices?.length) return { invoices: [] }

  const invoiceIds = invoices.map(invoice => invoice.id)
  const clientIds = [...new Set(invoices.map(invoice => invoice.client_id).filter(Boolean))]
  const [clients, payments] = await Promise.all([
    supabase.from('clients').select('id,name,company').eq('organization_id', org.id).in('id', clientIds.length ? clientIds : [-1]),
    supabase.from('invoice_payments').select('invoice_id,amount_cents,voided_at').eq('organization_id', org.id).in('invoice_id', invoiceIds),
  ])
  if (clients.error || payments.error) throw createError({ statusCode: 500, message: 'Les soldes à rapprocher sont indisponibles.' })

  return { invoices: buildReconciliationCandidates({ clients: clients.data || [], invoices, payments: payments.data || [] }) }
})
