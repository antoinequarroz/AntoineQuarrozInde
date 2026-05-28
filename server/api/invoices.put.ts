export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) throw createError({ statusCode: 400, message: 'Missing invoice id' })
  const supabase = getSupabaseAdmin()
  const payload = {
    client_id: body.clientId ? Number(body.clientId) : null,
    quote_id: body.quoteId ? Number(body.quoteId) : null,
    number: String(body.number || '').trim(),
    amount_cents: Number(body.amountCents || 0),
    currency: String(body.currency || 'CHF'),
    status: body.status || 'draft',
    issued_at: body.issuedAt || null,
    due_at: body.dueAt || null,
    paid_at: body.paidAt || null,
    notes: body.notes || null,
  }
  const { data, error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('organization_id', org.id)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
