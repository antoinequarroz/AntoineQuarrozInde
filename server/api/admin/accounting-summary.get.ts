import { buildAccountingSummary } from '../../utils/accountingSummary'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const query = getQuery(event)
  const year = new Date().getUTCFullYear()
  const from = String(query.from || `${year}-01-01`)
  const to = String(query.to || `${year}-12-31`)
  const currency = query.currency === 'EUR' ? 'EUR' : 'CHF'
  const fromTime = Date.parse(`${from}T00:00:00Z`)
  const toTime = Date.parse(`${to}T00:00:00Z`)
  const maxPeriodMs = 5 * 366 * 86_400_000
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || !Number.isFinite(fromTime) || !Number.isFinite(toTime) || fromTime > toTime || toTime - fromTime > maxPeriodMs) throw createError({ statusCode: 400, message: 'Période invalide ou supérieure à cinq ans.' })
  const supabase = getSupabaseAdmin()
  const [documentsResult, paymentsResult] = await Promise.all([
    supabase.from('invoices').select('id,document_type,status,subtotal_cents,tax_cents,total_cents,amount_cents').eq('organization_id', org.id).eq('currency', currency).gte('issued_at', from).lte('issued_at', to),
    supabase.from('invoice_payments').select('amount_cents,currency,voided_at').eq('organization_id', org.id).eq('currency', currency).gte('paid_at', from).lte('paid_at', to),
  ])
  const error = documentsResult.error || paymentsResult.error
  if (error) throw createError({ statusCode: 500, message: error.message })
  const ids = (documentsResult.data || []).map(row => row.id)
  const { data: items, error: itemsError } = ids.length ? await supabase.from('invoice_items').select('invoice_id,quantity,unit_price_cents,tax_rate,total_cents').eq('organization_id', org.id).in('invoice_id', ids) : { data: [], error: null }
  if (itemsError) throw createError({ statusCode: 500, message: itemsError.message })
  return { from, to, currency, ...buildAccountingSummary(documentsResult.data || [], items || [], paymentsResult.data || []) }
})
