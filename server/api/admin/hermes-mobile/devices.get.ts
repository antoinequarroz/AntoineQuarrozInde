export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const { data, error } = await getSupabaseAdmin().from('hermes_mobile_devices')
    .select('id,label,created_at,last_seen_at,revoked_at')
    .eq('organization_id', org.id).order('created_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, message: 'Appareils Hermes indisponibles.' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { devices: data || [] }
})
