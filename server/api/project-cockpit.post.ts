export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)
  const projectId = Number(body.projectId)
  const kind = cockpitKind(body.kind)
  if (!Number.isInteger(projectId) || projectId <= 0) throw createError({ statusCode: 400, message: 'Projet invalide.' })
  const supabase = getSupabaseAdmin()
  const payload = { organization_id: org.id, project_id: projectId, ...cockpitPayload(kind, body) }
  const { data, error } = await supabase.from(cockpitTables[kind]).insert(payload as any).select('*').single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
