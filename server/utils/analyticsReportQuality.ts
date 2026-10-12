// Use the same audience boundary for Hermes and the admin dashboard.
export const SITE_ANALYTICS_FILTER = `
  toString(properties.$host) IN ('antoinequarroz.ch', 'www.antoinequarroz.ch')
  AND lower(coalesce(toString(properties.is_test), '')) NOT IN ('true', '1')
  AND lower(coalesce(toString(properties.is_internal), '')) NOT IN ('true', '1')
  AND coalesce(toString(properties.$browser), '') != 'HeadlessChrome'
  AND (event NOT IN ('crm_lead_created', 'client_won', 'quote_accepted', 'invoice_created')
    OR toString(properties.traffic_classification) = 'production')`

export function marketingJourneyQuery() {
  return `SELECT entry_path, entry_source, count(), countIf(reached >= 2), countIf(reached >= 3), countIf(reached >= 4)
    FROM (
      SELECT distinct_id, toString(properties.aq_journey_id) AS journey,
        argMin(toString(properties.entry_path), timestamp) AS entry_path,
        argMin(toString(properties.entry_source), timestamp) AS entry_source,
        windowFunnel(86400)(toDateTime(timestamp), event = '$pageview', event = 'contact_clicked',
          event = 'contact_form_started', event = 'contact_sent') AS reached
      FROM events PREWHERE timestamp >= now() - INTERVAL 7 DAY
      WHERE ${SITE_ANALYTICS_FILTER} AND toString(properties.aq_traffic) = 'public'
        AND notEmpty(toString(properties.aq_journey_id))
        AND event IN ('$pageview', 'contact_clicked', 'contact_form_started', 'contact_sent')
      GROUP BY distinct_id, journey
      HAVING reached >= 1
    ) GROUP BY entry_path, entry_source ORDER BY count() DESC LIMIT 20`
}

export function renderJourneyRows(rows: unknown[][]) {
  const count = (value: unknown) => Math.max(0, Number(value) || 0)
  return rows.map(row => ({ entryPath: String(row[0]), source: String(row[1]), visits: count(row[2]),
    contactIntents: count(row[3]), formStarted: count(row[4]), contacts: count(row[5]) }))
}
