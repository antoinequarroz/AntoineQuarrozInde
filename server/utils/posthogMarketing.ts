type QueryResult = { results?: unknown[][] }

const APP_HOST = 'https://eu.posthog.com'
const HOST_FILTER = "toString(properties.$host) IN ('antoinequarroz.ch', 'www.antoinequarroz.ch')"

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
  const [comparison, sources, content] = await Promise.all([
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
  const alerts = [
    ...(current.publicErrors > 0 ? [{ key: 'public_errors', level: 'critical', title: 'Erreurs publiques détectées', detail: `${current.publicErrors} erreur(s) sur sept jours.` }] : []),
    ...(current.contacts > current.crmLeads ? [{ key: 'crm_gap', level: 'critical', title: 'Demandes non reliées au CRM', detail: `${current.contacts - current.crmLeads} demande(s) sans prospect créé.` }] : []),
    ...(current.contentVisitors >= 10 && current.contactIntents === 0 ? [{ key: 'cta_gap', level: 'attention', title: 'Contenus sans intention de contact', detail: 'Les contenus sont lus mais aucun clic de contact n’est observé.' }] : []),
    ...(current.formAbandoned >= 3 ? [{ key: 'form_abandonment', level: 'attention', title: 'Abandons du formulaire', detail: `${current.formAbandoned} abandon(s) observé(s).` }] : []),
  ]
  return {
    schemaVersion: 1, generatedAt: new Date().toISOString(), periodDays: 7, current, previous,
    sources: (sources.results || []).map(row => ({ source: String(row[0]), pageviews: number(row[1]) })),
    content: (content.results || []).map(row => ({ path: String(row[0]), visitors: number(row[1]), pageviews: number(row[2]) })),
    recommendations: recommendations.slice(0, 3), alerts,
    limits: ['Les étapes commerciales sont agrégées avec des identifiants hachés et ne contiennent aucune donnée de contact.', 'Le clic et la confirmation d’un rendez-vous restent comptés séparément.'],
  }
}
