import { normalizeClientAttribution } from '../utils/clientAttribution'
import { normalizeClientFollowUp } from '../utils/clientFollowUp'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const payload = {
    organization_id: org.id,
    name: String(body.name || '').trim(),
    company: body.company ? String(body.company).trim() : null,
    email: String(body.email || '').trim(),
    phone: body.phone ? String(body.phone).trim() : null,
    status: body.status || 'lead',
    notes: body.notes ? String(body.notes) : null,
    billing_street: body.billingStreet ? String(body.billingStreet).trim() : null,
    billing_building: body.billingBuilding ? String(body.billingBuilding).trim() : null,
    billing_postal_code: body.billingPostalCode ? String(body.billingPostalCode).trim() : null,
    billing_city: body.billingCity ? String(body.billingCity).trim() : null,
    billing_country: String(body.billingCountry || 'CH').trim().toUpperCase(),
    ...normalizeClientAttribution(body),
    ...normalizeClientFollowUp(body),
    preferred_locale: body.preferredLocale === 'en' || body.preferredLocale === 'de' ? body.preferredLocale : 'fr',
    marketing_opt_out_at: body.marketingOptOutAt ? String(body.marketingOptOutAt) : null,
  }

  if (!payload.name || !payload.email) {
    throw createError({ statusCode: 400, message: 'Name and email are required' })
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'client.create',
    entityType: 'client',
    entityId: data.id,
    clientId: data.id,
    payload: {
      name: data.name,
      email: data.email,
      status: data.status,
      followUpFieldsSet: [
        data.next_follow_up_at ? 'next_follow_up_at' : null,
        data.follow_up_note ? 'follow_up_note' : null,
        data.last_contacted_at ? 'last_contacted_at' : null,
      ].filter(Boolean),
      nextFollowUpAt: data.next_follow_up_at,
      hasFollowUpNote: Boolean(data.follow_up_note),
      lastContactedAt: data.last_contacted_at,
    },
  })
  if (data.status === 'active') {
    await capturePostHogBusinessEvent({
      event: 'client_won',
      origin: 'client_creation',
      organizationId: org.id,
      entityType: 'client',
      entityId: data.id,
      clientId: data.id,
    })
  }
  return data
})
