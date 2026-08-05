export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('marketing_events')
    .select('event,variant,path,created_at')
    .eq('organization_id', org.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10_000)
  if (error) throw createError({ statusCode: 500, message: error.message })

  const events = data || []
  const count = (name: string, variant?: string) => events.filter(row => row.event === name && (!variant || row.variant === variant)).length
  const views = count('hero_view')
  const primaryClicks = count('hero_cta_primary_click')
  const bookingClicks = count('booking_calendar_click')
  const projectViews = count('project_case_study_view')
  const projectClicks = count('project_case_study_click') + count('project_live_click') + count('project_code_click')
  const contactSuccess = count('contact_form_submit_success')
  const byEvent = Object.entries(events.reduce<Record<string, number>>((totals, row) => {
    totals[row.event] = (totals[row.event] || 0) + 1
    return totals
  }, {})).map(([event, total]) => ({ event, total })).sort((a, b) => b.total - a.total)
  const variants = ['A', 'B'].map(variant => {
    const variantViews = count('hero_view', variant)
    const clicks = count('hero_cta_primary_click', variant)
    return { variant, views: variantViews, clicks, conversionRate: variantViews ? Math.round(clicks / variantViews * 1_000) / 10 : 0 }
  })

  return {
    periodDays: 30,
    totals: { events: events.length, views, primaryClicks, bookingClicks, projectViews, projectClicks, contactSuccess },
    rates: {
      heroToCta: views ? Math.round(primaryClicks / views * 1_000) / 10 : 0,
      heroToContact: views ? Math.round(contactSuccess / views * 1_000) / 10 : 0,
    },
    byEvent,
    variants,
  }
})
