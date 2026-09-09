import { timingSafeEqual } from 'node:crypto'

function secretsMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer)
}

export function isHermesReadRequestAuthorized(authorization: string, expectedToken: string) {
  if (!authorization.startsWith('Bearer ')) return false
  const receivedToken = authorization.slice('Bearer '.length).trim()
  return Boolean(receivedToken && expectedToken && secretsMatch(receivedToken, expectedToken))
}

export function requireHermesReadAccess(event: any) {
  const config = useRuntimeConfig()
  const expectedToken = String(config.hermesReadToken || '')
  const authorization = String(getHeader(event, 'authorization') || '')

  if (!isHermesReadRequestAuthorized(authorization, expectedToken)) {
    throw createError({ statusCode: 401, message: 'Lecture Hermes non autorisee.' })
  }

  setResponseHeaders(event, {
    'Cache-Control': 'private, no-store',
    Vary: 'Authorization',
  })
}
