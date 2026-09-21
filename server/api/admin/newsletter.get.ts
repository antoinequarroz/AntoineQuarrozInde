export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('newsletter_subscriptions')
    .select('id,email,locale,source_path,status,consented_at,unsubscribed_at')
    .eq('organization_id', org.id)
    .order('consented_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: 'Les inscriptions ne peuvent pas être chargées.' })

  return (data || []).map(item => ({
    id: item.id,
    email: item.email,
    locale: item.locale,
    sourcePath: item.source_path,
    status: item.status,
    consentedAt: item.consented_at,
    unsubscribedAt: item.unsubscribed_at,
  }))
})
