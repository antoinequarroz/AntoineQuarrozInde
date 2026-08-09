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

export default defineCachedEventHandler(async (event) => {
  await requireAdmin(event)
  const config = useRuntimeConfig()
  const apiKey = String(process.env.PLAUSIBLE_STATS_API_KEY || '').trim()
  const siteId = String(process.env.PLAUSIBLE_SITE_ID || config.public.plausibleDomain || '').trim()
  if (!apiKey || !siteId) return { configured: false, siteId, totals: null, sources: [] }

  try {
    const [summary, sources] = await Promise.all([
      queryPlausible(apiKey, {
        site_id: siteId,
        metrics: ['visitors', 'visits', 'pageviews', 'bounce_rate', 'visit_duration', 'events'],
        date_range: '30d',
      }),
      queryPlausible(apiKey, {
        site_id: siteId,
        metrics: ['visitors', 'visits'],
        date_range: '30d',
        dimensions: ['visit:source'],
        order_by: [['visitors', 'desc']],
        pagination: { limit: 8, offset: 0 },
      }),
    ])
    const metrics = summary.results?.[0]?.metrics || []
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
    }
  }
  catch (error: any) {
    console.warn('[plausible-stats] query failed:', error?.message || error)
    return { configured: true, unavailable: true, siteId, totals: null, sources: [] }
  }
}, {
  maxAge: 600,
  name: 'admin-plausible-stats',
  getKey: event => String(getHeader(event, 'x-organization-id') || 'default'),
})
