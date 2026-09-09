import { Lumail } from 'lumail'

const EMAIL_STATUSES = new Set([
  'queued',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'complained',
  'failed',
])

function safeCursor(value: unknown) {
  const cursor = typeof value === 'string' ? value.trim() : ''
  return cursor && cursor.length <= 200 ? cursor : undefined
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const config = useRuntimeConfig()
  const apiKey = String(config.lumailApiKey || '')
  if (!apiKey) {
    throw createError({ statusCode: 503, message: 'Le suivi Lumail n’est pas configuré.' })
  }

  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 40, 1), 100)
  const after = safeCursor(query.after)
  const before = after ? undefined : safeCursor(query.before)

  const lumail = new Lumail({ apiKey })
  const { data, error } = await lumail.emails.list({ limit, after, before })

  if (error) {
    throw createError({ statusCode: 502, message: 'Lumail ne peut pas fournir l’historique pour le moment.' })
  }

  const emails = (data?.data || []).map(email => ({
    id: email.id,
    messageId: email.message_id,
    to: email.to,
    from: email.from,
    subject: email.subject,
    createdAt: email.created_at,
    status: EMAIL_STATUSES.has(email.last_event) ? email.last_event : 'sent',
    tags: (email.tags || []).map(tag => ({ name: tag.name, value: tag.value })),
  }))

  const counts = emails.reduce((summary, email) => {
    summary.total += 1
    if (['delivered', 'opened', 'clicked'].includes(email.status)) summary.delivered += 1
    if (['opened', 'clicked'].includes(email.status)) summary.engaged += 1
    if (['bounced', 'complained', 'failed'].includes(email.status)) summary.attention += 1
    if (['queued', 'sent'].includes(email.status)) summary.pending += 1
    return summary
  }, { total: 0, delivered: 0, engaged: 0, attention: 0, pending: 0 })

  return {
    emails,
    counts,
    hasMore: Boolean(data?.has_more),
    nextCursor: data?.has_more ? emails.at(-1)?.id || null : null,
  }
})
