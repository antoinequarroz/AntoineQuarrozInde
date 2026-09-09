import { timingSafeEqual } from 'node:crypto'

function secretsMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer)
}

export function isHermesPublishRequestAuthorized(authorization: string, expectedToken: string) {
  if (!authorization.startsWith('Bearer ')) return false
  const receivedToken = authorization.slice('Bearer '.length).trim()
  return Boolean(receivedToken && expectedToken && secretsMatch(receivedToken, expectedToken))
}

export function requireHermesPublishAccess(event: any) {
  const config = useRuntimeConfig()
  const expectedToken = String(config.hermesPublishToken || '')
  const authorization = String(getHeader(event, 'authorization') || '')

  if (!isHermesPublishRequestAuthorized(authorization, expectedToken)) {
    throw createError({ statusCode: 401, message: 'Publication Hermes non autorisee.' })
  }

  setResponseHeaders(event, {
    'Cache-Control': 'private, no-store',
    Vary: 'Authorization, Idempotency-Key',
  })
}
