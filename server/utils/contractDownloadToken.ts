import { createHmac, timingSafeEqual } from 'node:crypto'

type ContractDownloadClaims = {
  contractId: number
  organizationId: string
  expiresAt: number
}

function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createContractDownloadToken(claims: ContractDownloadClaims, secret: string) {
  if (!secret) throw new Error('Contract download secret is not configured')
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}

export function verifyContractDownloadToken(token: string, secret: string, now = Date.now()) {
  if (!token || !secret) return null
  const [payload, receivedSignature, ...extra] = token.split('.')
  if (!payload || !receivedSignature || extra.length) return null
  const expectedSignature = signature(payload, secret)
  const received = Buffer.from(receivedSignature)
  const expected = Buffer.from(expectedSignature)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ContractDownloadClaims
    if (!Number.isInteger(claims.contractId) || claims.contractId <= 0) return null
    if (!claims.organizationId || !Number.isFinite(claims.expiresAt) || claims.expiresAt < now) return null
    return claims
  }
  catch {
    return null
  }
}
