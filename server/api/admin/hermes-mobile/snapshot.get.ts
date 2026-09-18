export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const { data, error } = await getSupabaseAdmin().from('hermes_mobile_snapshots')
    .select('revision,source_fetched_at,payload,updated_at,device_id')
    .eq('organization_id', org.id).maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'Espace Hermes indisponible.' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { snapshot: data || null }
})
