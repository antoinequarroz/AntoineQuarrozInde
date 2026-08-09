export default defineEventHandler(async (event) => {
  const { user, org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('project_time_entries')
    .select('id,project_id,task_id,description,started_at')
    .eq('organization_id', org.id)
    .eq('created_by_user_id', user.id)
    .eq('entry_source', 'timer')
    .is('stopped_at', null)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) return null
  const { data: project } = await supabase.from('projects').select('title').eq('organization_id', org.id).eq('id', data.project_id).maybeSingle()
  return { ...data, project_title: project?.title || 'Projet' }
})
