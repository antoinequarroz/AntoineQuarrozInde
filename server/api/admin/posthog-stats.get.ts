type PostHogQueryResult = {
  columns?: string[]
  results?: unknown[][]
}

const POSTHOG_APP_HOST = 'https://eu.posthog.com'

async function queryPostHog(apiKey: string, projectId: string, name: string, query: string) {
  return await $fetch<PostHogQueryResult>(`${POSTHOG_APP_HOST}/api/projects/${encodeURIComponent(projectId)}/query/`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body: {
      query: { kind: 'HogQLQuery', query },
      name,
      refresh: 'blocking',
    },
  })
}

function numeric(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function calendarDate(offsetDays = 0) {
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
  const apiKey = String(config.posthogPersonalApiKey || '').trim()
  const projectId = String(config.posthogProjectId || '').trim()

  if (!apiKey || !projectId) {
    return { configured: false, projectId, periodDays: 30, totals: null, sources: [], trend: [] }
  }

  try {
    const [summary, sources, trend] = await Promise.all([
      queryPostHog(apiKey, projectId, 'site_admin_summary_30d', `
        SELECT
          uniqExactIf(distinct_id, event = '$pageview') AS visitors,
          countIf(event = '$pageview') AS pageviews,
          countIf(event = 'contact_sent') AS contacts,
          countIf(event = 'newsletter_subscribed') AS newsletter_subscriptions,
          countIf(event = 'booking_clicked') AS booking_clicks
        FROM events
        PREWHERE timestamp >= now() - INTERVAL 30 DAY
        WHERE toString(properties.$host) IN ('antoinequarroz.ch', 'www.antoinequarroz.ch')
      `),
      queryPostHog(apiKey, projectId, 'site_admin_sources_30d', `
        SELECT
          if(
            notEmpty(toString(properties.$utm_source)),
            toString(properties.$utm_source),
            if(
              notEmpty(toString(properties.$referring_domain)) AND toString(properties.$referring_domain) != '$direct',
              toString(properties.$referring_domain),
              'Direct / inconnu'
            )
          ) AS source,
          uniqExact(distinct_id) AS visitors,
          count() AS pageviews
        FROM events
        PREWHERE timestamp >= now() - INTERVAL 30 DAY
        WHERE event = '$pageview'
          AND toString(properties.$host) IN ('antoinequarroz.ch', 'www.antoinequarroz.ch')
        GROUP BY source
        ORDER BY visitors DESC
        LIMIT 8
      `),
      queryPostHog(apiKey, projectId, 'site_admin_daily_audience_30d', `
        SELECT
          toString(toDate(toTimeZone(timestamp, 'Europe/Zurich'))) AS date,
          uniqExact(distinct_id) AS visitors,
          count() AS pageviews
        FROM events
        PREWHERE timestamp >= now() - INTERVAL 30 DAY
        WHERE event = '$pageview'
          AND toString(properties.$host) IN ('antoinequarroz.ch', 'www.antoinequarroz.ch')
        GROUP BY date
        ORDER BY date ASC
      `),
    ])

    const metrics = summary.results?.[0] || []
    const trendByDate = new Map((trend.results || []).map(row => [
      String(row[0] || ''),
      { visitors: numeric(row[1]), pageviews: numeric(row[2]) },
    ]))

    return {
      configured: true,
      projectId,
      periodDays: 30,
      totals: {
        visitors: numeric(metrics[0]),
        pageviews: numeric(metrics[1]),
        contacts: numeric(metrics[2]),
        newsletterSubscriptions: numeric(metrics[3]),
        bookingClicks: numeric(metrics[4]),
      },
      sources: (sources.results || []).map(row => ({
        source: String(row[0] || 'Direct / inconnu'),
        visitors: numeric(row[1]),
        pageviews: numeric(row[2]),
      })),
      trend: Array.from({ length: 30 }, (_, index) => {
        const date = calendarDate(index - 29)
        const point = trendByDate.get(date)
        return { date, visitors: point?.visitors || 0, pageviews: point?.pageviews || 0 }
      }),
    }
  }
  catch (error: any) {
    console.warn('[posthog-stats] query failed:', error?.message || error)
    return { configured: true, unavailable: true, projectId, periodDays: 30, totals: null, sources: [], trend: [] }
  }
}, {
  maxAge: 600,
  name: 'admin-posthog-stats',
  varies: ['authorization', 'x-organization-id'],
  getKey: event => String(getHeader(event, 'x-organization-id') || 'default'),
})
