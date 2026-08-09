export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const projectId = Number(getQuery(event).projectId)
  if (!Number.isInteger(projectId) || projectId <= 0) throw createError({ statusCode: 400, message: 'Projet invalide.' })
  const supabase = getSupabaseAdmin()
  const projectQuery = supabase.from('projects').select('*').eq('organization_id', org.id).eq('id', projectId).single()
  const [project, milestones, timeEntries, notes, deliverables, tasks] = await Promise.all([
    projectQuery,
    supabase.from('project_milestones').select('*').eq('organization_id', org.id).eq('project_id', projectId).order('due_at'),
    supabase.from('project_time_entries').select('*').eq('organization_id', org.id).eq('project_id', projectId).order('worked_at', { ascending: false }),
    supabase.from('project_notes').select('*').eq('organization_id', org.id).eq('project_id', projectId).order('occurred_at', { ascending: false }),
    supabase.from('project_deliverables').select('*').eq('organization_id', org.id).eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('tasks').select('id,title,status,priority,due_date').eq('organization_id', org.id).eq('project_id', projectId).order('created_at', { ascending: false }),
  ])
  const error = project.error || milestones.error || timeEntries.error || notes.error || deliverables.error || tasks.error
  if (error) throw createError({ statusCode: project.error?.code === 'PGRST116' ? 404 : 500, message: error.message })
  const minutes = (timeEntries.data || []).reduce((sum, entry) => sum + Number(entry.minutes || 0), 0)
  return { project: project.data, milestones: milestones.data || [], timeEntries: timeEntries.data || [], notes: notes.data || [], deliverables: deliverables.data || [], tasks: tasks.data || [], totals: { minutes } }
})
