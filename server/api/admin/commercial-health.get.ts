import { summarizeCommercialWorkflow } from '../../utils/commercialObservability'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const requestedHours = Number(getQuery(event).hours || 24)
  const windowHours = Number.isFinite(requestedHours) ? Math.min(Math.max(Math.round(requestedHours), 1), 168) : 24
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('audit_logs')
    .select('action,entity_type,entity_id,payload,created_at')
    .eq('organization_id', org.id)
    .in('action', ['commercial_workflow.success', 'commercial_workflow.failure', 'commercial_workflow.recovered'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw createError({ statusCode: 500, message: 'La santé du parcours commercial est momentanément indisponible.' })

  return {
    generatedAt: new Date().toISOString(),
    windowHours,
    ...summarizeCommercialWorkflow(data || []),
  }
})
