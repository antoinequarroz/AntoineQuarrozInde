import { reportApplicationError } from '../utils/errorReporting'

const requests = new Map<string, { count: number, resetAt: number }>()

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  const entry = requests.get(ip)

  if (!entry || entry.resetAt < now) requests.set(ip, { count: 1, resetAt: now + 60_000 })
  else if (++entry.count > 10) throw createError({ statusCode: 429, message: 'Too many reports' })

  const body = await readBody<Record<string, unknown>>(event)
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message || message.length > 2_000) throw createError({ statusCode: 400, message: 'Invalid report' })

  await reportApplicationError({
    source: 'client',
    severity: body.severity === 'warning' ? 'warning' : 'error',
    message,
    stack: typeof body.stack === 'string' ? body.stack : null,
    path: typeof body.path === 'string' ? body.path : null,
    metadata: { userAgent: getHeader(event, 'user-agent')?.slice(0, 300) },
  })

  setResponseStatus(event, 202)
  return { accepted: true }
})
