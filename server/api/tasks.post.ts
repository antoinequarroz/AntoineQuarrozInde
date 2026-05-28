export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const payload = {
    organization_id: org.id,
    title: String(body.title || '').trim(),
    description: body.description ? String(body.description) : null,
    status: body.status || 'todo',
    priority: body.priority || 'medium',
    due_date: body.dueDate || null,
    client_id: body.clientId ? Number(body.clientId) : null,
    project_id: body.projectId ? Number(body.projectId) : null,
  }

  if (!payload.title) throw createError({ statusCode: 400, message: 'Title is required' })

  const { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'task.create',
    entityType: 'task',
    entityId: data.id,
    clientId: data.client_id,
    payload: { title: data.title, status: data.status, priority: data.priority },
  })
  return data
})
