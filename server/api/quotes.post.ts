import { computeTotals, normalizeBillingItems } from '../utils/billing'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()
  const items = normalizeBillingItems(body.items)
  const totals = computeTotals(items)
  const payload = {
    organization_id: org.id,
    client_id: body.clientId ? Number(body.clientId) : null,
    number: String(body.number || '').trim(),
    title: String(body.title || '').trim(),
    amount_cents: totals.totalCents || Number(body.amountCents || 0),
    subtotal_cents: totals.subtotalCents,
    tax_cents: totals.taxCents,
    total_cents: totals.totalCents || Number(body.amountCents || 0),
    currency: String(body.currency || 'CHF'),
    status: body.status || 'draft',
    issued_at: body.issuedAt || null,
    valid_until: body.validUntil || null,
    notes: body.notes || null,
  }
  if (!payload.number || !payload.title) throw createError({ statusCode: 400, message: 'Missing fields' })
  let { data, error } = await supabase.from('quotes').insert(payload).select('*').single()
  if (error && (error.message.includes('subtotal_cents') || error.message.includes('tax_cents') || error.message.includes('total_cents'))) {
    const legacyPayload = {
      organization_id: payload.organization_id,
      client_id: payload.client_id,
      number: payload.number,
      title: payload.title,
      amount_cents: payload.amount_cents,
      currency: payload.currency,
      status: payload.status,
      issued_at: payload.issued_at,
      valid_until: payload.valid_until,
      notes: payload.notes,
    }
    const retry = await supabase.from('quotes').insert(legacyPayload).select('*').single()
    data = retry.data
    error = retry.error
  }
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (items.length) {
    const rows = items.map(item => ({ ...item, organization_id: org.id, quote_id: data.id }))
    await supabase.from('quote_items').insert(rows)
  }
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'quote.create',
    entityType: 'quote',
    entityId: data.id,
    clientId: data.client_id,
    payload: { number: data.number, title: data.title, status: data.status, amount_cents: data.amount_cents },
  })
  return { ...data, items }
})
