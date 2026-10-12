import { SITE_ANALYTICS_FILTER, marketingJourneyQuery, renderJourneyRows } from './analyticsReportQuality'

type QueryResult = { results?: unknown[][] }

const APP_HOST = 'https://eu.posthog.com'
const HOST_FILTER = SITE_ANALYTICS_FILTER

async function queryPostHog(apiKey: string, projectId: string, name: string, hogql: string) {
  return await $fetch<QueryResult>(`${APP_HOST}/api/projects/${encodeURIComponent(projectId)}/query/`, {
    method: 'POST', headers: { authorization: `Bearer ${apiKey}` },
    body: { query: { kind: 'HogQLQuery', query: hogql }, name, refresh: 'blocking' },
  })
}

function number(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function metrics(row: unknown[] = []) {
  return {
    visitors: number(row[0]), pageviews: number(row[1]), contentVisitors: number(row[2]), contactIntents: number(row[3]),
    contacts: number(row[4]), newsletterSubscriptions: number(row[5]), bookingClicks: number(row[6]),
    bookingConfirmations: number(row[7]), crmLeads: number(row[8]), clientsWon: number(row[9]),
    acceptedQuotes: number(row[10]), acceptedQuoteCents: number(row[11]), invoicesCreated: number(row[12]),
    invoicedCents: number(row[13]), publicErrors: number(row[14]), formStarted: number(row[15]),
    formAbandoned: number(row[16]), formErrors: number(row[17]),
  }
}

export async function buildPostHogMarketingReport(apiKey: string, projectId: string) {
  const [comparison, sources, content, journeys, quality] = await Promise.all([
    queryPostHog(apiKey, projectId, 'hermes_marketing_weekly', `
      SELECT period, uniqExactIf(distinct_id, event = '$pageview'), countIf(event = '$pageview'),
        uniqExactIf(distinct_id, event = '$pageview' AND (startsWith(toString(properties.$pathname), '/blog/') OR startsWith(toString(properties.$pathname), '/projets/'))),
        uniqExactIf(distinct_id, event IN ('contact_clicked', 'booking_clicked')), countIf(event = 'contact_sent'),
        countIf(event = 'newsletter_subscribed'), countIf(event = 'booking_clicked'), countIf(event = 'booking_confirmed'),
        countIf(event = 'crm_lead_created'), countIf(event = 'client_won'), countIf(event = 'quote_accepted'),
        sumIf(toIntOrZero(toString(properties.amount_cents)), event = 'quote_accepted'), countIf(event = 'invoice_created'),
        sumIf(toIntOrZero(toString(properties.amount_cents)), event = 'invoice_created'), countIf(event = 'public_app_error'),
        countIf(event = 'contact_form_started'), countIf(event = 'contact_form_abandoned'), countIf(event = 'contact_form_submit_error')
      FROM (SELECT *, if(timestamp >= now() - INTERVAL 7 DAY, 'current', 'previous') AS period FROM events
        PREWHERE timestamp >= now() - INTERVAL 14 DAY WHERE ${HOST_FILTER}) GROUP BY period`),
    queryPostHog(apiKey, projectId, 'hermes_marketing_sources', `
      SELECT if(notEmpty(toString(properties.$utm_source)), lowerUTF8(toString(properties.$utm_source)),
        if(notEmpty(toString(properties.$referring_domain)) AND lowerUTF8(toString(properties.$referring_domain)) NOT IN ('$direct', 'antoinequarroz.ch', 'www.antoinequarroz.ch'),
          lowerUTF8(toString(properties.$referring_domain)), 'Direct / inconnu')) AS source, count()
      FROM events PREWHERE timestamp >= now() - INTERVAL 7 DAY WHERE event = '$pageview' AND ${HOST_FILTER}
      GROUP BY source ORDER BY count() DESC LIMIT 5`),
    queryPostHog(apiKey, projectId, 'hermes_marketing_content', `
      SELECT toString(properties.$pathname) AS path, uniqExact(distinct_id), count()
      FROM events PREWHERE timestamp >= now() - INTERVAL 7 DAY WHERE event = '$pageview' AND ${HOST_FILTER}
        AND (startsWith(toString(properties.$pathname), '/blog/') OR startsWith(toString(properties.$pathname), '/projets/'))
      GROUP BY path ORDER BY count() DESC LIMIT 5`),
    queryPostHog(apiKey, projectId, 'hermes_marketing_journeys', marketingJourneyQuery()),
    queryPostHog(apiKey, projectId, 'hermes_marketing_quality', `SELECT
      countIf(event IN ('crm_lead_created', 'client_won', 'quote_accepted', 'invoice_created') AND coalesce(toString(properties.traffic_classification), '') = 'test'),
      countIf(event IN ('crm_lead_created', 'client_won', 'quote_accepted', 'invoice_created') AND coalesce(toString(properties.traffic_classification), '') NOT IN ('production', 'test')),
      countIf(lower(coalesce(toString(properties.is_test), '')) IN ('true', '1') OR lower(coalesce(toString(properties.is_internal), '')) IN ('true', '1') OR coalesce(toString(properties.$browser), '') = 'HeadlessChrome'),
      countIf(event = '$pageview' AND coalesce(toString(properties.aq_traffic), '') != 'public')
      FROM events PREWHERE timestamp >= now() - INTERVAL 7 DAY
      WHERE toString(properties.$host) IN ('antoinequarroz.ch', 'www.antoinequarroz.ch')`),
  ])
  const periods = new Map((comparison.results || []).map(row => [String(row[0]), row.slice(1)]))
  const current = metrics(periods.get('current')); const previous = metrics(periods.get('previous'))
  const recommendations: string[] = []
  if (current.visitors < 20) recommendations.push('Conserver la collecte : moins de 20 visiteurs sur sept jours ne permettent pas encore de comparer les pages ou les canaux.')
  else {
    recommendations.push(current.contentVisitors / Math.max(1, current.visitors) < 0.3
      ? 'Renforcer les liens de l’accueil vers les articles et projets.'
      : 'Conserver les accès actuels vers les contenus.')
    recommendations.push(current.contentVisitors >= 10 && current.contactIntents === 0
      ? 'Tester un appel à l’action plus concret sur le contenu le plus lu.'
      : 'Conserver les appels à l’action pendant une nouvelle semaine.')
  }
  if (current.formStarted >= 3 && current.contacts === 0) recommendations.push('Examiner le formulaire : plusieurs démarrages n’aboutissent à aucune demande.')
  const journeyRows = renderJourneyRows(journeys.results || [])
  const qualityRow = quality.results?.[0] || []
  const dataQuality = { excludedBusinessTests: number(qualityRow[0]), unclassifiedBusinessEvents: number(qualityRow[1]),
    flaggedInternalOrTestEvents: number(qualityRow[2]), legacyPageviews: number(qualityRow[3]) }
  if (dataQuality.unclassifiedBusinessEvents) recommendations.unshift('Ne pas attribuer l’historique commercial : les événements sans classification vérifiée sont exclus des résultats.')
  const alerts = [
    ...(current.publicErrors > 0 ? [{ key: 'public_errors', level: 'critical', title: 'Erreurs publiques détectées', detail: `${current.publicErrors} erreur(s) sur sept jours.` }] : []),
    // Separate browser/server counters do not prove that a particular request
    // failed to reach the CRM. Only a correlated workflow can establish that.
    ...(current.contentVisitors >= 10 && current.contactIntents === 0 ? [{ key: 'cta_gap', level: 'attention', title: 'Contenus sans intention de contact', detail: 'Les contenus sont lus mais aucun clic de contact n’est observé.' }] : []),
    ...(current.formAbandoned >= 3 ? [{ key: 'form_abandonment', level: 'attention', title: 'Abandons du formulaire', detail: `${current.formAbandoned} abandon(s) observé(s).` }] : []),
  ]
  return {
    schemaVersion: 1, generatedAt: new Date().toISOString(), periodDays: 7, current, previous,
    dataQuality,
    journeys: { status: journeyRows.length ? 'measured' : 'awaiting_data', unit: 'visitor_session', windowHours: 24,
      steps: ['visit', 'contact_clicked', 'contact_form_started', 'contact_sent'], rows: journeyRows },
    sources: (sources.results || []).map(row => ({ source: String(row[0]), pageviews: number(row[1]) })),
    content: (content.results || []).map(row => ({ path: String(row[0]), visitors: number(row[1]), pageviews: number(row[2]) })),
    recommendations: recommendations.slice(0, 3), alerts,
    limits: ['Les tests, visites internes signalées et navigateurs automatisés sont exclus. Les anciennes visites non classées ne peuvent pas être requalifiées avec certitude.',
      'Les événements commerciaux sans classification production vérifiée sont exclus ; aucune vente n’est attribuée au SEO par ces compteurs.',
      'Les compteurs globaux sont indépendants. Seul le tableau des parcours relie une visite, un clic, un démarrage et un envoi dans cet ordre, par visiteur et session, sous 24 heures.',
      'Les parcours utilisent la page et la source d’entrée de la session ; les nouvelles propriétés ne réparent pas rétroactivement l’historique. Les sessions récentes peuvent encore aboutir.',
      'Le clic et la confirmation d’un rendez-vous restent comptés séparément.'],
  }
}
