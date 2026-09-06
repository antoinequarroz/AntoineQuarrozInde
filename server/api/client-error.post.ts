import { reportApplicationError } from '../utils/errorReporting'

const requests = createBoundedRateLimiter({ windowMs: 60_000, maxRequests: 10, maxKeys: 1_000 })
const MAX_ERROR_REPORT_REQUEST_BYTES = 32 * 1024

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!requests.isAllowed(ip)) throw createError({ statusCode: 429, message: 'Too many reports' })

  const body = await readJsonBodyLimited(event, MAX_ERROR_REPORT_REQUEST_BYTES)
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message || message.length > 2_000) throw createError({ statusCode: 400, message: 'Invalid report' })

  await reportApplicationError({
    source: 'client',
    severity: body.severity === 'warning' ? 'warning' : 'error',
    message,
    stack: typeof body.stack === 'string' ? body.stack.slice(0, 24_000) : null,
    path: typeof body.path === 'string' ? body.path.slice(0, 1_000) : null,
    metadata: { userAgent: getHeader(event, 'user-agent')?.slice(0, 300) },
  })

  setResponseStatus(event, 202)
  return { accepted: true }
})
