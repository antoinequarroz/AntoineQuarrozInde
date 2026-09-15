const DELIVERY_STATUSES = new Set(['pending', 'sent', 'failed', 'uncertain', 'suppressed'])

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 40, 1), 100)
  const page = Math.max(Number(query.page) || 0, 0)
  const status = typeof query.status === 'string' && DELIVERY_STATUSES.has(query.status) ? query.status : null
  const from = page * limit

  let request = getSupabaseAdmin()
    .from('email_deliveries')
    .select('id,client_id,category,template_key,locale,recipient,entity_type,entity_id,status,provider_id,attempt_count,error_code,created_at,last_attempt_at,sent_at', { count: 'exact' })
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)
  if (status) request = request.eq('status', status)
  const { data, count, error } = await request
  if (error) throw createError({ statusCode: 500, message: 'L’historique des e-mails ne peut pas être chargé.' })

  const emails = (data || []).map(row => ({
    id: String(row.id),
    messageId: row.provider_id,
    to: [row.recipient],
    from: 'info@antoinequarroz.ch',
    subject: String(row.template_key).replaceAll('_', ' '),
    createdAt: row.created_at,
    lastAttemptAt: row.last_attempt_at,
    sentAt: row.sent_at,
    status: row.status,
    attempts: row.attempt_count,
    errorCode: row.error_code,
    locale: row.locale,
    entityType: row.entity_type,
    entityId: row.entity_id,
    canRetry: row.status === 'failed' && Number(row.attempt_count) < 20,
    tags: [
      { name: 'category', value: row.category },
      { name: 'template', value: row.template_key },
      { name: 'locale', value: row.locale },
    ],
  }))
  const counts = emails.reduce((summary, email) => {
    summary.total += 1
    if (email.status === 'sent') summary.sent += 1
    if (email.status === 'failed' || email.status === 'uncertain') summary.attention += 1
    if (email.status === 'pending') summary.pending += 1
    if (email.status === 'suppressed') summary.suppressed += 1
    return summary
  }, { total: 0, sent: 0, attention: 0, pending: 0, suppressed: 0 })

  return { emails, counts, total: count || 0, hasMore: from + emails.length < (count || 0), nextPage: from + emails.length < (count || 0) ? page + 1 : null }
})
