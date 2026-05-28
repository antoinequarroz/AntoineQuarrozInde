type AuditCleanupRow = {
  id: number
}

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()

  const { data: rows, error: findError } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('organization_id', org.id)
    .eq('payload->>source', 'backfill')

  if (findError) throw createError({ statusCode: 500, message: findError.message })

  const ids = ((rows || []) as AuditCleanupRow[]).map(row => row.id)
  if (!ids.length) return { deleted: 0 }

  const { error: deleteError } = await supabase
    .from('audit_logs')
    .delete()
    .in('id', ids)

  if (deleteError) throw createError({ statusCode: 500, message: deleteError.message })
  return { deleted: ids.length }
})
