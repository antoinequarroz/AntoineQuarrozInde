const marketingRequests = createBoundedRateLimiter({ windowMs: 60_000, maxRequests: 60, maxKeys: 2_000 })
const MAX_MARKETING_EVENT_REQUEST_BYTES = 32 * 1024

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!marketingRequests.isAllowed(ip)) throw createError({ statusCode: 429, message: 'Too many events' })
  const body = await readJsonBodyLimited(event, MAX_MARKETING_EVENT_REQUEST_BYTES)
  const eventName = String(body.event || '')
  if (!isAllowedMarketingEvent(eventName)) throw createError({ statusCode: 400, message: 'Unknown event' })
  const metadata = marketingMetadataPayload(body.metadata)
  const org = await resolveOrganizationContext(event)
  const supabase = getSupabaseAdmin()

  const payload = {
    organization_id: org?.id ?? null,
    event: eventName,
    variant: ['A', 'B'].includes(String(body.variant)) ? String(body.variant) : null,
    path: body.path ? String(body.path).slice(0, 300) : null,
    locale: body.locale ? String(body.locale).slice(0, 10) : null,
    metadata,
  }

  const { error } = await supabase.from('marketing_events').insert(payload)
  if (error) {
    return { ok: false }
  }
  return { ok: true }
})
