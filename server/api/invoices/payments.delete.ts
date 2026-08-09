import { invoiceStatusFromPayments } from '../../utils/invoicePayments'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const paymentId = Number(body.id)
  const reason = String(body.reason || '').trim()
  if (!paymentId || !reason) throw createError({ statusCode: 400, message: 'Paiement et motif obligatoires.' })

  const supabase = getSupabaseAdmin()
  const { data: payment } = await supabase
    .from('invoice_payments')
    .select('id,invoice_id,voided_at')
    .eq('organization_id', org.id)
    .eq('id', paymentId)
    .single()
  if (!payment) throw createError({ statusCode: 404, message: 'Paiement introuvable.' })
  if (payment.voided_at) throw createError({ statusCode: 409, message: 'Ce paiement est déjà annulé.' })

  const voidedAt = new Date().toISOString()
  const { error } = await supabase.from('invoice_payments').update({ voided_at: voidedAt, void_reason: reason }).eq('organization_id', org.id).eq('id', paymentId)
  if (error) throw createError({ statusCode: 500, message: error.message })

  const [{ data: invoice }, { data: payments }] = await Promise.all([
    supabase.from('invoices').select('id,client_id,total_cents,amount_cents,due_at').eq('organization_id', org.id).eq('id', payment.invoice_id).single(),
    supabase.from('invoice_payments').select('amount_cents,voided_at').eq('organization_id', org.id).eq('invoice_id', payment.invoice_id),
  ])
  if (!invoice) throw createError({ statusCode: 404, message: 'Facture introuvable.' })
  const paidAmountCents = (payments || []).reduce((sum, row) => sum + (row.voided_at ? 0 : Number(row.amount_cents)), 0)
  const status = invoiceStatusFromPayments({ totalCents: Number(invoice.total_cents ?? invoice.amount_cents ?? 0), paidAmountCents, dueAt: invoice.due_at })
  await supabase.from('invoices').update({ status, paid_at: null }).eq('organization_id', org.id).eq('id', invoice.id)

  await logAudit({ organizationId: org.id, actorUserId: user?.id, action: 'invoice.payment_voided', entityType: 'invoice', entityId: invoice.id, clientId: invoice.client_id, payload: { payment_id: paymentId, reason } })
  return { success: true, paidAmountCents, status }
})
