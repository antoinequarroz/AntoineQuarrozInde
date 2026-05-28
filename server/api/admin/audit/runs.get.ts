type AuditRun = {
  id: number
  action: string
  payload: Record<string, any> | null
  created_at: string
}

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, payload, created_at')
    .eq('organization_id', org.id)
    .in('action', ['audit_backfill_run', 'audit_backfill_cleanup'])
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return (data || []) as AuditRun[]
})
