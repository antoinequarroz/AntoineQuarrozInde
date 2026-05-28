export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()
  const payload = {
    organization_id: org.id,
    client_id: body.clientId ? Number(body.clientId) : null,
    number: String(body.number || '').trim(),
    title: String(body.title || '').trim(),
    amount_cents: Number(body.amountCents || 0),
    currency: String(body.currency || 'CHF'),
    status: body.status || 'draft',
    issued_at: body.issuedAt || null,
    valid_until: body.validUntil || null,
    notes: body.notes || null,
  }
  if (!payload.number || !payload.title) throw createError({ statusCode: 400, message: 'Missing fields' })
  const { data, error } = await supabase.from('quotes').insert(payload).select('*').single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'quote.create',
    entityType: 'quote',
    entityId: data.id,
    clientId: data.client_id,
    payload: { number: data.number, title: data.title, status: data.status, amount_cents: data.amount_cents },
  })
  return data
})
