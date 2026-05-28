export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()
  const payload = {
    organization_id: org.id,
    client_id: body.clientId ? Number(body.clientId) : null,
    title: String(body.title || '').trim(),
    description: body.description || null,
    starts_at: body.startsAt,
    ends_at: body.endsAt,
    location: body.location || null,
    meeting_url: body.meetingUrl || null,
    status: body.status || 'scheduled',
  }
  if (!payload.title || !payload.starts_at || !payload.ends_at) {
    throw createError({ statusCode: 400, message: 'Missing fields' })
  }
  const { data, error } = await supabase.from('appointments').insert(payload).select('*').single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
