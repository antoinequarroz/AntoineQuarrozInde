export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody<{ id?: string }>(event)
  if (!body.id) throw createError({ statusCode: 400, message: 'Missing error id' })

  const supabase = getSupabaseAdmin()
  let query = supabase.from('application_errors').update({ resolved_at: new Date().toISOString() }).eq('id', body.id)
  query = org.role === 'owner'
    ? query.or(`organization_id.eq.${org.id},organization_id.is.null`)
    : query.eq('organization_id', org.id)

  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) throw createError({ statusCode: 404, message: 'Error report not found' })

  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'application_error.resolve',
    entityType: 'application_error',
    entityId: body.id,
  })
  return { resolved: true }
})
