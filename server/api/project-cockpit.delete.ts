export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const query = getQuery(event)
  const projectId = Number(query.projectId)
  const id = Number(query.id)
  const kind = cockpitKind(query.kind)
  if (![projectId, id].every(value => Number.isInteger(value) && value > 0)) throw createError({ statusCode: 400, message: 'Élément invalide.' })
  const supabase = getSupabaseAdmin()
  if (kind === 'time') {
    const { data: timeEntry, error: lookupError } = await supabase.from('project_time_entries').select('entry_source,stopped_at').eq('organization_id', org.id).eq('project_id', projectId).eq('id', id).maybeSingle()
    if (lookupError) throw createError({ statusCode: 500, message: lookupError.message })
    if (!timeEntry) throw createError({ statusCode: 404, message: 'Entrée de temps introuvable.' })
    if (timeEntry.entry_source === 'timer' && !timeEntry.stopped_at) throw createError({ statusCode: 409, message: 'Arrêtez le minuteur avant de supprimer cette entrée.' })
  }
  const { error } = await supabase.from(cockpitTables[kind]).delete().eq('organization_id', org.id).eq('project_id', projectId).eq('id', id)
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})
