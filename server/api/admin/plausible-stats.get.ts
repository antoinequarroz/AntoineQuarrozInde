type PlausibleQueryResult = {
  results?: Array<{ dimensions?: string[], metrics?: number[] }>
}

async function queryPlausible(apiKey: string, body: Record<string, unknown>) {
  return await $fetch<PlausibleQueryResult>('https://plausible.io/api/v2/query', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body,
  })
}

function plausibleCalendarDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export default defineCachedEventHandler(async (event) => {
  await requireAdmin(event)
  const config = useRuntimeConfig()
  const apiKey = String(process.env.PLAUSIBLE_STATS_API_KEY || '').trim()
  const siteId = String(process.env.PLAUSIBLE_SITE_ID || config.public.plausibleDomain || '').trim()
  if (!apiKey || !siteId) return { configured: false, siteId, totals: null, sources: [] }
  const dateRange = [plausibleCalendarDate(-29), plausibleCalendarDate()]

  try {
    const [summary, sources, trend] = await Promise.all([
      queryPlausible(apiKey, {
        site_id: siteId,
        metrics: ['visitors', 'visits', 'pageviews', 'bounce_rate', 'visit_duration', 'events'],
        date_range: dateRange,
      }),
      queryPlausible(apiKey, {
        site_id: siteId,
        metrics: ['visitors', 'visits'],
        date_range: dateRange,
        dimensions: ['visit:source'],
        order_by: [['visitors', 'desc']],
        pagination: { limit: 8, offset: 0 },
      }),
      queryPlausible(apiKey, {
        site_id: siteId,
        metrics: ['visitors', 'pageviews'],
        date_range: dateRange,
        dimensions: ['time:day'],
        order_by: [['time:day', 'asc']],
      }),
    ])
    const metrics = summary.results?.[0]?.metrics || []
    const trendByDate = new Map((trend.results || []).map(row => [
      row.dimensions?.[0] || '',
      { visitors: row.metrics?.[0] || 0, pageviews: row.metrics?.[1] || 0 },
    ]))
    return {
      configured: true,
      siteId,
      periodDays: 30,
      totals: {
        visitors: metrics[0] || 0,
        visits: metrics[1] || 0,
        pageviews: metrics[2] || 0,
        bounceRate: metrics[3] || 0,
        visitDuration: metrics[4] || 0,
        events: metrics[5] || 0,
      },
      sources: (sources.results || []).map(row => ({
        source: row.dimensions?.[0] || 'Direct / inconnu',
        visitors: row.metrics?.[0] || 0,
        visits: row.metrics?.[1] || 0,
      })),
      trend: Array.from({ length: 30 }, (_, index) => {
        const date = plausibleCalendarDate(index - 29)
        const point = trendByDate.get(date)
        return { date, visitors: point?.visitors || 0, pageviews: point?.pageviews || 0 }
      }),
    }
  }
  catch (error: any) {
    console.warn('[plausible-stats] query failed:', error?.message || error)
    return { configured: true, unavailable: true, siteId, totals: null, sources: [] }
  }
}, {
  maxAge: 600,
  name: 'admin-plausible-stats',
  varies: ['authorization', 'x-organization-id'],
  getKey: event => String(getHeader(event, 'x-organization-id') || 'default'),
})
