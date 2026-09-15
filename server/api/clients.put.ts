import { normalizeClientAttribution } from '../utils/clientAttribution'
import { listChangedFollowUpFields, normalizeClientFollowUp } from '../utils/clientFollowUp'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) throw createError({ statusCode: 400, message: 'Missing client id' })
  const validStatuses = ['lead', 'active', 'inactive'] as const
  if (Object.hasOwn(body, 'status') && !validStatuses.includes(body.status)) {
    throw createError({ statusCode: 400, message: 'Invalid client status' })
  }
  if (Object.hasOwn(body, 'expectedStatus') && !validStatuses.includes(body.expectedStatus)) {
    throw createError({ statusCode: 400, message: 'Invalid expected client status' })
  }

  const supabase = getSupabaseAdmin()
  const { data: existing, error: existingError } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', org.id)
    .eq('id', id)
    .maybeSingle()

  if (existingError) throw createError({ statusCode: 500, message: existingError.message })
  if (!existing) throw createError({ statusCode: 404, message: 'Client not found' })

  const followUpPayload = normalizeClientFollowUp(body)
  const normalizedAttribution = normalizeClientAttribution(body)
  const payload: Record<string, unknown> = { ...followUpPayload }
  const editableFields = [
    ['name', 'name', (value: unknown) => String(value || '').trim()],
    ['company', 'company', (value: unknown) => value ? String(value).trim() : null],
    ['email', 'email', (value: unknown) => String(value || '').trim()],
    ['phone', 'phone', (value: unknown) => value ? String(value).trim() : null],
    ['status', 'status', (value: unknown) => value || 'lead'],
    ['notes', 'notes', (value: unknown) => value ? String(value) : null],
    ['billingStreet', 'billing_street', (value: unknown) => value ? String(value).trim() : null],
    ['billingBuilding', 'billing_building', (value: unknown) => value ? String(value).trim() : null],
    ['billingPostalCode', 'billing_postal_code', (value: unknown) => value ? String(value).trim() : null],
    ['billingCity', 'billing_city', (value: unknown) => value ? String(value).trim() : null],
    ['billingCountry', 'billing_country', (value: unknown) => String(value || 'CH').trim().toUpperCase()],
    ['preferredLocale', 'preferred_locale', (value: unknown) => value === 'en' || value === 'de' ? value : 'fr'],
    ['marketingOptOutAt', 'marketing_opt_out_at', (value: unknown) => value ? String(value) : null],
  ] as const
  const attributionFields = [
    ['acquisitionSource', 'acquisition_source'],
    ['acquisitionMedium', 'acquisition_medium'],
    ['acquisitionCampaign', 'acquisition_campaign'],
  ] as const

  for (const [inputField, databaseField, normalize] of editableFields) {
    if (Object.hasOwn(body, inputField)) payload[databaseField] = normalize(body[inputField])
  }
  for (const [inputField, databaseField] of attributionFields) {
    if (Object.hasOwn(body, inputField)) payload[databaseField] = normalizedAttribution[databaseField]
  }

  if (!(payload.name ?? existing.name) || !(payload.email ?? existing.email)) {
    throw createError({ statusCode: 400, message: 'Name and email are required' })
  }

  let updateQuery = supabase
    .from('clients')
    .update(payload)
    .eq('organization_id', org.id)
    .eq('id', id)
  if (Object.hasOwn(body, 'expectedStatus')) updateQuery = updateQuery.eq('status', body.expectedStatus)
  if (Object.hasOwn(body, 'expectedNextFollowUpAt')) {
    updateQuery = body.expectedNextFollowUpAt === null
      ? updateQuery.is('next_follow_up_at', null)
      : updateQuery.eq('next_follow_up_at', body.expectedNextFollowUpAt)
  }
  const { data, error } = await updateQuery.select('*').maybeSingle()

  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) throw createError({ statusCode: 409, message: 'Client changed in another session' })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'client.update',
    entityType: 'client',
    entityId: data.id,
    clientId: data.id,
    payload: {
      name: data.name,
      email: data.email,
      status: data.status,
      followUpFieldsChanged: listChangedFollowUpFields(existing, followUpPayload),
      nextFollowUpAt: data.next_follow_up_at,
      hasFollowUpNote: Boolean(data.follow_up_note),
      lastContactedAt: data.last_contacted_at,
    },
  })
  return data
})
