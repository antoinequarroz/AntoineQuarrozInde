export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, message: error.message })
  const quotes = data ?? []
  if (!quotes.length) return []
  const ids = quotes.map(q => q.id)
  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('organization_id', org.id)
    .in('quote_id', ids)
    .order('position', { ascending: true })
  const byQuoteId = new Map<number, any[]>()
  for (const item of items ?? []) {
    const list = byQuoteId.get(item.quote_id) || []
    list.push(item)
    byQuoteId.set(item.quote_id, list)
  }
  return quotes.map(quote => ({ ...quote, items: byQuoteId.get(quote.id) || [] }))
})
