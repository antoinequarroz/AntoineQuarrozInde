import { normalizeCommercialActionStates } from '../../../app/utils/commercialActionState'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('audit_logs')
    .select('payload,created_at')
    .eq('organization_id', org.id)
    .eq('action', 'commercial_action.state_changed')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return normalizeCommercialActionStates(data || [])
})
