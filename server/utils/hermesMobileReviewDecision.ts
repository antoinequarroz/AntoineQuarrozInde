import { createError } from 'h3'

export const HERMES_MOBILE_REVIEW_DECISIONS = ['reviewed', 'changesRequested', 'later'] as const
export type HermesMobileReviewDecision = typeof HERMES_MOBILE_REVIEW_DECISIONS[number]

function invalid(message = 'Décision mobile invalide.'): never {
  throw createError({ statusCode: 400, message })
}

export function parseHermesMobileReviewDecision(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  const body = value as Record<string, unknown>
  const reviewID = typeof body.reviewID === 'string' ? body.reviewID.trim() : ''
  const expectedRevision = Number(body.expectedRevision)
  const expectedDigest = typeof body.expectedDigest === 'string' ? body.expectedDigest.trim().toLowerCase() : ''
  const decision = body.decision
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  const id = typeof body.id === 'string' ? body.id.trim().toLowerCase() : ''
  if (!reviewID || reviewID.length > 180) invalid('Rapport mobile invalide.')
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision <= 0) invalid('Révision mobile invalide.')
  if (!/^[0-9a-f]{64}$/.test(expectedDigest)) invalid('Version du rapport invalide.')
  if (!HERMES_MOBILE_REVIEW_DECISIONS.includes(decision as HermesMobileReviewDecision)) invalid()
  if (note.length > 500) invalid('Remarque trop longue.')
  if (decision === 'changesRequested' && !note) invalid('Précise la correction demandée.')
  if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) invalid('Identifiant de décision invalide.')
  const createdAt = typeof body.createdAt === 'string' && !Number.isNaN(Date.parse(body.createdAt))
    ? new Date(body.createdAt).toISOString() : null
  return { id: id || null, reviewID, expectedRevision, expectedDigest, decision: decision as HermesMobileReviewDecision, note, createdAt }
}

export function parseHermesMobileReviewReceipt(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Accusé mobile invalide.')
  const body = value as Record<string, unknown>
  const status = body.status
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (status !== 'applied' && status !== 'rejected') invalid('État de traitement invalide.')
  if (reason.length > 500 || (status === 'rejected' && !reason)) invalid('Motif de refus invalide.')
  return { status, reason: reason || null }
}
