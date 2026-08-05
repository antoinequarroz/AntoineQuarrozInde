import { nextBillingNumber, type BillingKind } from '../../../utils/billingWorkflow'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const kind = String(getQuery(event).kind || '') as BillingKind
  if (kind !== 'quote' && kind !== 'invoice') {
    throw createError({ statusCode: 400, message: 'Type de document invalide.' })
  }
  const table = kind === 'quote' ? 'quotes' : 'invoices'
  const { data, error } = await getSupabaseAdmin()
    .from(table)
    .select('number')
    .eq('organization_id', org.id)
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { number: nextBillingNumber(kind, (data || []).map(row => String(row.number))) }
})
