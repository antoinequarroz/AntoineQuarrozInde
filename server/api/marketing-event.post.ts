export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const payload = {
    organization_id: org?.id ?? null,
    event: String(body.event || 'unknown'),
    variant: body.variant ? String(body.variant) : null,
    path: body.path ? String(body.path) : null,
    locale: body.locale ? String(body.locale) : null,
    metadata: body.metadata ?? {},
  }

  const { error } = await supabase.from('marketing_events').insert(payload)
  if (error) {
    return { ok: false }
  }
  return { ok: true }
})
