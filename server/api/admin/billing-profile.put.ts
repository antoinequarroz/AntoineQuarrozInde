import { isValidSwissIban, normalizeIban } from '../../utils/typstBilling'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const country = String(body.billingCountry || 'CH').trim().toUpperCase()
  const iban = normalizeIban(String(body.billingIban || ''))
  if (!/^[A-Z]{2}$/.test(country)) {
    throw createError({ statusCode: 400, message: 'Le pays doit utiliser un code ISO à deux lettres.' })
  }
  if (iban && !isValidSwissIban(iban)) {
    throw createError({ statusCode: 400, message: 'L’IBAN doit être un IBAN suisse ou liechtensteinois valide.' })
  }

  const payload = {
    billing_name: String(body.billingName || '').trim() || null,
    billing_street: String(body.billingStreet || '').trim() || null,
    billing_building: String(body.billingBuilding || '').trim() || null,
    billing_postal_code: String(body.billingPostalCode || '').trim() || null,
    billing_city: String(body.billingCity || '').trim() || null,
    billing_country: country,
    billing_email: String(body.billingEmail || '').trim() || null,
    billing_phone: String(body.billingPhone || '').trim() || null,
    billing_iban: iban || null,
    billing_uid: String(body.billingUid || '').trim() || null,
    billing_terms: String(body.billingTerms || '').trim() || null,
  }
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('organizations')
    .update(payload)
    .eq('id', org.id)
    .select('*')
    .single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'billing_profile.update',
    entityType: 'organization',
    entityId: org.id,
    payload: { billing_country: country, has_iban: Boolean(iban) },
  })
  return data
})
