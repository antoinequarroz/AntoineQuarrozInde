export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { data, error } = await getSupabaseAdmin().from('social_insights')
    .select('snapshot,received_at').eq('organization_id', org.id).eq('platform', 'instagram').maybeSingle()
  if (error) throw createError({ statusCode: 503, message: 'Les statistiques sociales sont temporairement indisponibles.' })
  return { instagram: data ? validateInstagramSnapshot(data.snapshot) : null, receivedAt: data?.received_at || null }
})
