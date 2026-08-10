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
  if (kind === 'note' && data.client_visible) {
    await notifyClientProjectUpdate({ organizationId: org.id, projectId, eventType: 'note', eventId: data.id, title: data.title, message: 'Une nouvelle note ou un compte rendu a été partagé dans votre projet.' })
  }
  if (kind === 'deliverable' && data.client_visible && data.status !== 'draft') {
    await notifyClientProjectUpdate({ organizationId: org.id, projectId, eventType: 'deliverable', eventId: data.id, title: data.title, message: 'Un nouveau livrable est disponible dans votre espace client.' })
  }
  return data
})
