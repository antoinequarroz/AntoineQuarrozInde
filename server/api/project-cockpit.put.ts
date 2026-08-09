export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)
  const projectId = Number(body.projectId)
  const supabase = getSupabaseAdmin()
  if (!Number.isInteger(projectId) || projectId <= 0) throw createError({ statusCode: 400, message: 'Projet invalide.' })

  if (body.kind === 'project') {
    const status = String(body.status || '')
    if (!['planning', 'active', 'review', 'delivered', 'paused'].includes(status)) throw createError({ statusCode: 400, message: 'Statut projet invalide.' })
    const { data, error } = await supabase.from('projects').update({
      workflow_status: status,
      starts_at: body.startsAt || null,
      target_at: body.targetAt || null,
      ...projectFinancialPayload(body),
    }).eq('organization_id', org.id).eq('id', projectId).select('*').single()
    if (error) throw createError({ statusCode: 500, message: error.message })
    return data
  }

  const kind = cockpitKind(body.kind)
  const id = Number(body.id)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Élément invalide.' })
  const { data, error } = await supabase.from(cockpitTables[kind]).update(cockpitPayload(kind, body)).eq('organization_id', org.id).eq('project_id', projectId).eq('id', id).select('*').single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
