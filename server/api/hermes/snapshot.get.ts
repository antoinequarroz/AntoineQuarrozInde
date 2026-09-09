const DEFAULT_LOOKBACK_HOURS = 24
const MAX_LOOKBACK_HOURS = 24 * 31
const MAX_ROWS_PER_SECTION = 100

function parseSince(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      const earliest = Date.now() - MAX_LOOKBACK_HOURS * 60 * 60 * 1000
      return new Date(Math.max(parsed.getTime(), earliest)).toISOString()
    }
  }
  return new Date(Date.now() - DEFAULT_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()
}

export default defineEventHandler(async (event) => {
  requireHermesReadAccess(event)

  const config = useRuntimeConfig()
  const organizationSlug = String(config.public.defaultOrganizationSlug || '')
  if (!organizationSlug) {
    throw createError({ statusCode: 500, message: 'Organisation Hermes non configuree.' })
  }

  const query = getQuery(event)
  const since = parseSince(query.since)
  const supabase = getSupabaseAdmin()
  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', organizationSlug)
    .maybeSingle()

  if (organizationError || !organization) {
    throw createError({ statusCode: 500, message: 'Organisation introuvable.' })
  }

  const organizationId = organization.id
  const [messagesResult, clientsResult, projectsResult, quotesResult, invoicesResult] = await Promise.all([
    supabase
      .from('contact_messages')
      .select('id,name,email,subject,message,status,tags,created_at')
      .eq('organization_id', organizationId)
      .eq('status', 'new')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(MAX_ROWS_PER_SECTION),
    supabase
      .from('clients')
      .select('id,name,company,email,status,created_at')
      .eq('organization_id', organizationId)
      .in('status', ['lead', 'active'])
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS_PER_SECTION),
    supabase
      .from('projects')
      .select('id,title,slug,category,live_url,code_url,client_id,completed_at,updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(MAX_ROWS_PER_SECTION),
    supabase
      .from('quotes')
      .select('id,client_id,number,title,amount_cents,currency,status,issued_at,valid_until,created_at')
      .eq('organization_id', organizationId)
      .in('status', ['draft', 'sent'])
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS_PER_SECTION),
    supabase
      .from('invoices')
      .select('id,client_id,number,amount_cents,currency,status,issued_at,due_at,paid_at,document_type,created_at')
      .eq('organization_id', organizationId)
      .in('status', ['draft', 'sent', 'overdue'])
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS_PER_SECTION),
  ])

  const failedResult = [messagesResult, clientsResult, projectsResult, quotesResult, invoicesResult]
    .find(result => result.error)
  if (failedResult?.error) {
    console.warn('[hermes-snapshot] unable to build snapshot:', failedResult.error.message)
    throw createError({ statusCode: 500, message: 'Instantane Hermes indisponible.' })
  }

  return {
    generatedAt: new Date().toISOString(),
    since,
    prospects: messagesResult.data ?? [],
    maintenance: {
      clients: clientsResult.data ?? [],
      projects: projectsResult.data ?? [],
    },
    administration: {
      quotes: quotesResult.data ?? [],
      invoices: invoicesResult.data ?? [],
    },
  }
})
