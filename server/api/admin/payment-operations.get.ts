import { buildPaymentOperations } from '../../utils/paymentOperations'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const [clients, invoices, payments, sessions] = await Promise.all([
    supabase.from('clients').select('id,name,company').eq('organization_id', org.id),
    supabase.from('invoices').select('id,client_id,number,total_cents,amount_cents,currency,status,document_type,issued_at,due_at').eq('organization_id', org.id),
    supabase.from('invoice_payments').select('id,invoice_id,amount_cents,currency,method,paid_at,reference,provider,voided_at,void_reason,created_at').eq('organization_id', org.id),
    supabase.from('payment_checkout_sessions').select('id,invoice_id,client_id,provider,provider_session_id,amount_cents,currency,status,expires_at,completed_at,created_at').eq('organization_id', org.id),
  ])
  const queryError = [clients, invoices, payments, sessions].find(result => result.error)?.error
  if (queryError) {
    console.error('Unable to load payment operations', queryError)
    throw createError({ statusCode: 500, message: 'Le journal des encaissements est temporairement indisponible.' })
  }

  return buildPaymentOperations({
    clients: clients.data || [],
    invoices: invoices.data || [],
    payments: payments.data || [],
    sessions: sessions.data || [],
  })
})
