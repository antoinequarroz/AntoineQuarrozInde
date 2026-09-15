import { normalizeInvoicePayment } from '../../utils/invoicePayments'
import { recordInvoicePayment } from '../../utils/recordInvoicePayment'
import { createHash } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const correlationId = resolveCommercialCorrelationId(event)
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const invoiceId = Number(body.invoiceId)
  if (!invoiceId) throw createError({ statusCode: 400, message: 'Facture invalide.' })
  if (body.confirmation !== 'ENREGISTRER_PAIEMENT') throw createError({ statusCode: 400, message: 'Confirme explicitement l’enregistrement du paiement.' })
  const idempotencyKey = String(body.idempotencyKey || '')
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) throw createError({ statusCode: 400, message: 'Clé de soumission du paiement invalide.' })

  let payment
  try {
    payment = normalizeInvoicePayment(body)
  }
  catch (error) {
    throw createError({ statusCode: 400, message: error instanceof Error ? error.message : 'Paiement invalide.' })
  }

  const fingerprint = createHash('sha256').update(`manual:${org.id}:${invoiceId}:${idempotencyKey}`).digest('hex')
  try {
    const result = await recordInvoicePayment({ organizationId: org.id, actorUserId: user?.id, invoiceId, payment, bankImportFingerprint: fingerprint, source: 'manual' })
    await recordCommercialWorkflowEvent({
      event,
      correlationId,
      organizationId: org.id,
      actorUserId: user?.id,
      stage: 'payment',
      outcome: result.created ? 'success' : 'recovered',
      entityType: 'payment',
      entityId: result.payment.id,
      code: result.created ? null : 'payment_already_recorded',
    })
    return result
  }
  catch (error) {
    const statusCode = Number((error as { statusCode?: number }).statusCode || 500)
    if (statusCode >= 500) {
      await recordCommercialWorkflowEvent({
        event,
        correlationId,
        organizationId: org.id,
        actorUserId: user?.id,
        stage: 'payment',
        outcome: 'failure',
        entityType: 'invoice',
        entityId: invoiceId,
        code: 'payment_record_failed',
      })
      throw createError({ statusCode: 500, message: 'Le paiement n’a pas pu être enregistré.' })
    }
    throw error
  }
})
