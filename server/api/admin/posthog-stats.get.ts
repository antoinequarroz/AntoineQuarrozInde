type PostHogQueryResult = { columns?: string[], results?: unknown[][] }

const POSTHOG_APP_HOST = 'https://eu.posthog.com'
const SITE_HOSTS = "('antoinequarroz.ch', 'www.antoinequarroz.ch')"
const SITE_FILTER = `toString(properties.$host) IN ${SITE_HOSTS}`

async function queryPostHog(apiKey: string, projectId: string, name: string, query: string) {
  return await $fetch<PostHogQueryResult>(`${POSTHOG_APP_HOST}/api/projects/${encodeURIComponent(projectId)}/query/`, {
    method: 'POST', headers: { authorization: `Bearer ${apiKey}` },
    body: { query: { kind: 'HogQLQuery', query }, name, refresh: 'blocking' },
  })
}

function numeric(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0 }
function percentage(value: number, base: number) { return base ? Math.round(value / base * 1_000) / 10 : 0 }
function calendarDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
function periodMetrics(row: unknown[] = []) {
  return { visitors: numeric(row[0]), pageviews: numeric(row[1]), contentVisitors: numeric(row[2]), contactIntents: numeric(row[3]), contacts: numeric(row[4]), newsletterSubscriptions: numeric(row[5]), bookingClicks: numeric(row[6]) }
}
function recommendations(current: ReturnType<typeof periodMetrics>, previous: ReturnType<typeof periodMetrics>, content: Array<{ path: string, visitors: number, pageviews: number }>) {
  const result: Array<{ level: 'info' | 'attention' | 'success', title: string, detail: string }> = []
  if (current.visitors < 20) result.push({ level: 'info', title: 'Constituer la référence', detail: 'Le volume est encore trop faible pour arbitrer une page ou un canal. Laisse le suivi fonctionner au moins deux semaines.' })
  if (current.visitors >= 20 && current.contentVisitors / current.visitors < 0.3) result.push({ level: 'attention', title: 'Mieux orienter vers les contenus', detail: 'Moins de 30 % des visiteurs consultent un article ou un projet. Renforce les liens depuis l’accueil.' })
  if (current.contentVisitors >= 10 && current.contactIntents === 0) result.push({ level: 'attention', title: 'Tester les appels à l’action', detail: 'Les contenus sont lus sans clic vers le contact. Essaie un CTA plus concret sur les pages les plus vues.' })
  if (current.contacts > previous.contacts && current.contacts > 0) result.push({ level: 'success', title: 'Demandes en progression', detail: 'Les demandes envoyées progressent par rapport aux sept jours précédents. Conserve les pages et canaux à l’origine de cette hausse.' })
  if (content.length && current.visitors >= 20) result.push({ level: 'info', title: 'Priorité de contenu', detail: `${content[0]?.path} est le contenu le plus consulté de la période. Utilise-le comme point de départ pour le prochain test.` })
  if (!result.length) result.push({ level: 'info', title: 'Aucune anomalie détectée', detail: 'Continue la collecte. Une recommandation apparaîtra dès qu’un signal exploitable sera mesuré.' })
  return result.slice(0, 3)
}

export default defineCachedEventHandler(async (event) => {
  await requireAdmin(event)
  const config = useRuntimeConfig()
  const apiKey = String(config.posthogPersonalApiKey || '').trim()
  const projectId = String(config.posthogProjectId || '').trim()
  const empty = { projectId, periodDays: 30, totals: null, sources: [], trend: [], content: [], funnel: [], weekly: null, recommendations: [] }
  if (!apiKey || !projectId) return { configured: false, ...empty }

  try {
    const [summary, sources, trend, content, weekly] = await Promise.all([
      queryPostHog(apiKey, projectId, 'site_admin_summary_30d', `
        SELECT uniqExactIf(distinct_id, event = '$pageview'), countIf(event = '$pageview'), countIf(event = 'contact_sent'),
          countIf(event = 'newsletter_subscribed'), countIf(event = 'booking_clicked')
        FROM events PREWHERE timestamp >= now() - INTERVAL 30 DAY WHERE ${SITE_FILTER}`),
      queryPostHog(apiKey, projectId, 'site_admin_sources_30d', `
        SELECT if(notEmpty(toString(properties.$utm_source)), lowerUTF8(toString(properties.$utm_source)),
          if(notEmpty(toString(properties.$referring_domain)) AND lowerUTF8(toString(properties.$referring_domain)) NOT IN ('$direct', 'antoinequarroz.ch', 'www.antoinequarroz.ch'),
            lowerUTF8(toString(properties.$referring_domain)), 'Direct / inconnu')) AS source,
          uniqExact(distinct_id), count()
        FROM events PREWHERE timestamp >= now() - INTERVAL 30 DAY WHERE event = '$pageview' AND ${SITE_FILTER}
        GROUP BY source ORDER BY count() DESC LIMIT 8`),
      queryPostHog(apiKey, projectId, 'site_admin_daily_audience_30d', `
        SELECT toString(toDate(toTimeZone(timestamp, 'Europe/Zurich'))) AS date, uniqExact(distinct_id), count()
        FROM events PREWHERE timestamp >= now() - INTERVAL 30 DAY WHERE event = '$pageview' AND ${SITE_FILTER}
        GROUP BY date ORDER BY date ASC`),
      queryPostHog(apiKey, projectId, 'site_admin_content_30d', `
        SELECT toString(properties.$pathname) AS path, uniqExact(distinct_id), count()
        FROM events PREWHERE timestamp >= now() - INTERVAL 30 DAY WHERE event = '$pageview' AND ${SITE_FILTER}
          AND (startsWith(toString(properties.$pathname), '/blog/') OR startsWith(toString(properties.$pathname), '/projets/'))
        GROUP BY path ORDER BY count() DESC LIMIT 10`),
      queryPostHog(apiKey, projectId, 'site_admin_weekly_comparison', `
        SELECT period, uniqExactIf(distinct_id, event = '$pageview'), countIf(event = '$pageview'),
          uniqExactIf(distinct_id, event = '$pageview' AND (startsWith(toString(properties.$pathname), '/blog/') OR startsWith(toString(properties.$pathname), '/projets/'))),
          uniqExactIf(distinct_id, event IN ('contact_clicked', 'booking_clicked')), countIf(event = 'contact_sent'),
          countIf(event = 'newsletter_subscribed'), countIf(event = 'booking_clicked')
        FROM (SELECT *, if(timestamp >= now() - INTERVAL 7 DAY, 'current', 'previous') AS period FROM events
          PREWHERE timestamp >= now() - INTERVAL 14 DAY WHERE ${SITE_FILTER}) GROUP BY period`),
    ])

    const metrics = summary.results?.[0] || []
    const trendByDate = new Map((trend.results || []).map(row => [String(row[0] || ''), { visitors: numeric(row[1]), pageviews: numeric(row[2]) }]))
    const contentRows = (content.results || []).map(row => ({ path: String(row[0] || '/'), visitors: numeric(row[1]), pageviews: numeric(row[2]) }))
    const weeklyRows = new Map((weekly.results || []).map(row => [String(row[0]), row.slice(1)]))
    const current = periodMetrics(weeklyRows.get('current')); const previous = periodMetrics(weeklyRows.get('previous'))
    const funnel = [
      { key: 'visitors', label: 'Visiteurs du site', value: current.visitors },
      { key: 'content', label: 'Article ou projet consulté', value: current.contentVisitors },
      { key: 'intent', label: 'Clic vers le contact', value: current.contactIntents },
      { key: 'conversion', label: 'Demande envoyée', value: current.contacts },
    ].map((step, index, steps) => ({ ...step, rate: index ? percentage(step.value, steps[index - 1]?.value || 0) : 100 }))

    return {
      configured: true, projectId, periodDays: 30,
      totals: { visitors: numeric(metrics[0]), pageviews: numeric(metrics[1]), contacts: numeric(metrics[2]), newsletterSubscriptions: numeric(metrics[3]), bookingClicks: numeric(metrics[4]) },
      sources: (sources.results || []).map(row => ({ source: String(row[0] || 'Direct / inconnu'), visitors: numeric(row[1]), pageviews: numeric(row[2]) })),
      trend: Array.from({ length: 30 }, (_, index) => { const date = calendarDate(index - 29); const point = trendByDate.get(date); return { date, visitors: point?.visitors || 0, pageviews: point?.pageviews || 0 } }),
      content: contentRows, funnel, weekly: { current, previous }, recommendations: recommendations(current, previous, contentRows),
    }
  }
  catch (error: any) {
    console.warn('[posthog-stats] query failed:', error?.message || error)
    return { configured: true, unavailable: true, ...empty }
  }
}, { maxAge: 600, name: 'admin-posthog-stats', varies: ['authorization', 'x-organization-id'], getKey: event => String(getHeader(event, 'x-organization-id') || 'default') })
