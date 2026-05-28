export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()
  const payload = {
    organization_id: org.id,
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
  if (!payload.number) throw createError({ statusCode: 400, message: 'Missing number' })
  const { data, error } = await supabase.from('invoices').insert(payload).select('*').single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'invoice.create',
    entityType: 'invoice',
    entityId: data.id,
    clientId: data.client_id,
    payload: { number: data.number, status: data.status, amount_cents: data.amount_cents },
  })
  return data
})
