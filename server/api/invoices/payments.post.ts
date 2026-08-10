import { normalizeInvoicePayment } from '../../utils/invoicePayments'
import { recordInvoicePayment } from '../../utils/recordInvoicePayment'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const invoiceId = Number(body.invoiceId)
  if (!invoiceId) throw createError({ statusCode: 400, message: 'Facture invalide.' })

  let payment
  try {
    payment = normalizeInvoicePayment(body)
  }
  catch (error) {
    throw createError({ statusCode: 400, message: error instanceof Error ? error.message : 'Paiement invalide.' })
  }

  return recordInvoicePayment({ organizationId: org.id, actorUserId: user?.id, invoiceId, payment })
})
