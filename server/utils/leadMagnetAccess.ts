import { createHmac, timingSafeEqual } from 'node:crypto'

export const IA_PME_LEAD_MAGNET_SLUG = 'checklist-ia-pme'
export const IA_PME_LEAD_MAGNET_FILE = 'lead-magnets/checklist-pilote-ia-pme-30-jours.pdf'
export const IA_PME_LEAD_MAGNET_PATH = `/ressources/${IA_PME_LEAD_MAGNET_SLUG}`

type LeadMagnetClaims = {
  slug: string
  expiresAt: number
}

function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createLeadMagnetToken(slug: string, secret: string, now = Date.now()) {
  if (!secret) throw new Error('Lead magnet secret is unavailable')
  const claims: LeadMagnetClaims = { slug, expiresAt: now + 24 * 60 * 60 * 1000 }
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}

export function verifyLeadMagnetToken(token: string, slug: string, secret: string, now = Date.now()) {
  if (!token || !secret) return false
  const [payload, receivedSignature, extra] = token.split('.')
  if (!payload || !receivedSignature || extra) return false
  const expectedSignature = signature(payload, secret)
  const received = Buffer.from(receivedSignature)
  const expected = Buffer.from(expectedSignature)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as LeadMagnetClaims
    return claims.slug === slug && Number.isSafeInteger(claims.expiresAt) && claims.expiresAt >= now
  }
  catch {
    return false
  }
}

export function isSupportedLeadMagnet(value: unknown): value is typeof IA_PME_LEAD_MAGNET_SLUG {
  return value === IA_PME_LEAD_MAGNET_SLUG
}
