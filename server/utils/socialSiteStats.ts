import { SITE_ANALYTICS_FILTER } from './analyticsReportQuality'
import type { SocialSiteResponse } from '../../shared/types/socialInsights'

export const SOCIAL_SITE_QUERY = `
  SELECT platform, uniqExact(distinct_id), count()
  FROM (
    SELECT distinct_id, multiIf(
      source IN ('instagram', 'ig', 'instagram.com', 'www.instagram.com', 'l.instagram.com'), 'instagram',
      source IN ('linkedin', 'linkedin.com', 'www.linkedin.com', 'lnkd.in'), 'linkedin',
      source IN ('x', 'twitter', 'x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 't.co'), 'x', ''
    ) AS platform
    FROM (
      SELECT distinct_id, lowerUTF8(if(notEmpty(toString(properties.$utm_source)),
        toString(properties.$utm_source), toString(properties.$referring_domain))) AS source
      FROM events PREWHERE timestamp >= now() - INTERVAL 30 DAY
      WHERE event = '$pageview' AND ${SITE_ANALYTICS_FILTER}
    )
  ) WHERE platform != '' GROUP BY platform`

/** Only a confirmed, complete query permits a missing group to mean zero. */
export function socialSiteResponse(results: unknown, available: boolean, configured: boolean): SocialSiteResponse {
  const rows = new Map<string, { visitors: number, pageviews: number }>()
  let valid = available && Array.isArray(results)
  if (Array.isArray(results)) for (const row of results) {
    if (!Array.isArray(row) || !['instagram', 'linkedin', 'x'].includes(row[0]) || rows.has(row[0])
        || ![row[1], row[2]].every(n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0)) { valid = false; break }
    rows.set(row[0], { visitors: row[1], pageviews: row[2] })
  }
  return { configured, available: valid, measuredAt: new Date().toISOString(), periodDays: 30,
    rows: (['instagram', 'linkedin', 'x'] as const).map(platform => ({ platform,
      visitors: valid ? rows.get(platform)?.visitors || 0 : null, pageviews: valid ? rows.get(platform)?.pageviews || 0 : null })) }
}
