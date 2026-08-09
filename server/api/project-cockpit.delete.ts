export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const query = getQuery(event)
  const projectId = Number(query.projectId)
  const id = Number(query.id)
  const kind = cockpitKind(query.kind)
  if (![projectId, id].every(value => Number.isInteger(value) && value > 0)) throw createError({ statusCode: 400, message: 'Élément invalide.' })
  const { error } = await getSupabaseAdmin().from(cockpitTables[kind]).delete().eq('organization_id', org.id).eq('project_id', projectId).eq('id', id)
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})
