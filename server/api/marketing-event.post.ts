const marketingRequests = new Map<string, { count: number, resetAt: number }>()

export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  const rate = marketingRequests.get(ip)
  if (!rate || rate.resetAt < now) marketingRequests.set(ip, { count: 1, resetAt: now + 60_000 })
  else if (++rate.count > 60) throw createError({ statusCode: 429, message: 'Too many events' })
  const eventName = String(body.event || '')
  if (!isAllowedMarketingEvent(eventName)) throw createError({ statusCode: 400, message: 'Unknown event' })
  const metadata = marketingMetadataPayload(body.metadata)

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
