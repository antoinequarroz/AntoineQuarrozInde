import { nextBillingNumber, type BillingKind } from '../../../utils/billingWorkflow'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const kind = String(getQuery(event).kind || '') as BillingKind
  if (kind !== 'quote' && kind !== 'invoice' && kind !== 'credit_note') {
    throw createError({ statusCode: 400, message: 'Type de document invalide.' })
  }
  const table = kind === 'quote' ? 'quotes' : 'invoices'
  let query = getSupabaseAdmin()
    .from(table)
    .select('number')
    .eq('organization_id', org.id)
  if (kind === 'credit_note') query = query.eq('document_type', 'credit_note')
  else if (kind === 'invoice') query = query.eq('document_type', 'invoice')
  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { number: nextBillingNumber(kind, (data || []).map(row => String(row.number))) }
})
