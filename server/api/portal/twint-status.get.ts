export default defineEventHandler(async (event) => {
  const { org, client } = await requirePortalClient(event)
  const sessionId = String(getQuery(event).sessionId || '').trim()
  if (!sessionId || sessionId.length > 255) throw createError({ statusCode: 400, message: 'Session de paiement invalide.' })
  const { data, error } = await getSupabaseAdmin().from('payment_checkout_sessions')
    .select('invoice_id,status,amount_cents,currency,completed_at,expires_at')
    .eq('organization_id', org.id).eq('client_id', client.id).eq('provider_session_id', sessionId).maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) throw createError({ statusCode: 404, message: 'Session de paiement introuvable.' })
  return data
})
