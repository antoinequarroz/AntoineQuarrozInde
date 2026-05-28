export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id,action,entity_type,entity_id,payload,created_at')
    .eq('organization_id', org.id)
    .in('action', ['pipeline_reminder_run', 'pipeline_reminder_email'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }
  return data || []
})

