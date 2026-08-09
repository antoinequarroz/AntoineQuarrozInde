export default defineEventHandler(async (event) => {
  const { user, org } = await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)
  const projectId = Number(body.projectId)
  const taskId = body.taskId ? Number(body.taskId) : null
  const description = String(body.description || '').trim()
  if (!Number.isInteger(projectId) || projectId <= 0) throw createError({ statusCode: 400, message: 'Projet invalide.' })
  if (!description || description.length > 500) throw createError({ statusCode: 400, message: 'Décrivez le travail suivi en 500 caractères maximum.' })
  if (taskId && (!Number.isInteger(taskId) || taskId <= 0)) throw createError({ statusCode: 400, message: 'Tâche invalide.' })

  const supabase = getSupabaseAdmin()
  const { data: project } = await supabase.from('projects').select('id').eq('organization_id', org.id).eq('id', projectId).maybeSingle()
  if (!project) throw createError({ statusCode: 404, message: 'Projet introuvable.' })
  if (taskId) {
    const { data: task } = await supabase.from('tasks').select('id').eq('organization_id', org.id).eq('project_id', projectId).eq('id', taskId).maybeSingle()
    if (!task) throw createError({ statusCode: 400, message: 'Cette tâche n’appartient pas au projet.' })
  }
  const { data: running } = await supabase.from('project_time_entries').select('id,project_id,description').eq('organization_id', org.id).eq('created_by_user_id', user.id).eq('entry_source', 'timer').is('stopped_at', null).maybeSingle()
  if (running) throw createError({ statusCode: 409, message: 'Un minuteur est déjà actif. Arrêtez-le avant d’en démarrer un autre.' })

  const startedAt = new Date()
  const { data, error } = await supabase.from('project_time_entries').insert({
    organization_id: org.id,
    project_id: projectId,
    task_id: taskId,
    description,
    minutes: 0,
    worked_at: startedAt.toISOString().slice(0, 10),
    entry_source: 'timer',
    started_at: startedAt.toISOString(),
    created_by_user_id: user.id,
  }).select('*').single()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, message: 'Un minuteur est déjà actif.' })
    throw createError({ statusCode: 500, message: error.message })
  }
  return data
})
