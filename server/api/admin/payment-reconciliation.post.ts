import { createHash } from 'node:crypto'
import { bankFingerprintPayload, normalizeConfirmedBankTransaction } from '../../../shared/utils/bankReconciliation'
import { normalizeInvoicePayment } from '../../utils/invoicePayments'
import { recordInvoicePayment } from '../../utils/recordInvoicePayment'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const invoiceId = Number(body.invoiceId)
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) throw createError({ statusCode: 400, message: 'Facture invalide.' })

  let transaction
  try {
    transaction = normalizeConfirmedBankTransaction(body.transaction || {})
  }
  catch (error) {
    throw createError({ statusCode: 400, message: error instanceof Error ? error.message : 'Mouvement bancaire invalide.' })
  }
  const fingerprintPayload = bankFingerprintPayload(transaction)
  if (!fingerprintPayload) throw createError({ statusCode: 400, message: 'Ce mouvement ne contient aucun identifiant bancaire stable.' })
  const fingerprint = createHash('sha256').update(fingerprintPayload).digest('hex')
  const payment = normalizeInvoicePayment({
    amountCents: transaction.amountCents,
    method: 'bank_transfer',
    paidAt: transaction.bookedAt,
    reference: transaction.reference || transaction.transactionId,
    notes: transaction.description ? `Rapprochement bancaire · ${transaction.description}` : 'Rapprochement bancaire',
  })

  return recordInvoicePayment({
    organizationId: org.id,
    actorUserId: user?.id,
    invoiceId,
    payment,
    bankImportFingerprint: fingerprint,
    bankCurrency: transaction.currency,
    source: 'bank_reconciliation',
  })
})
