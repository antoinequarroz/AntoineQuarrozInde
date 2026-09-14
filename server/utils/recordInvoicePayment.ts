import type { normalizeInvoicePayment } from './invoicePayments'

type NormalizedPayment = ReturnType<typeof normalizeInvoicePayment>

type RecordInvoicePaymentInput = {
  organizationId: string
  actorUserId?: string | null
  invoiceId: number
  payment: NormalizedPayment
  bankImportFingerprint?: string | null
  bankCurrency?: string | null
  source?: 'manual' | 'bank_reconciliation'
}

export async function recordInvoicePayment(input: RecordInvoicePaymentInput) {
  const supabase = getSupabaseAdmin()
  async function findExistingManualPayment() {
    if (input.source !== 'manual' || !input.bankImportFingerprint) return null
    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('organization_id', input.organizationId)
      .eq('invoice_id', input.invoiceId)
      .eq('bank_import_fingerprint', input.bankImportFingerprint)
      .maybeSingle()
    if (existingPaymentError) throw createError({ statusCode: 500, message: 'Impossible de vérifier cette soumission de paiement.' })
    if (!existingPayment) return null
    const sameSubmission = Number(existingPayment.amount_cents) === input.payment.amountCents
      && existingPayment.method === input.payment.method
      && existingPayment.paid_at === input.payment.paidAt
      && (existingPayment.reference || null) === input.payment.reference
      && (existingPayment.notes || null) === input.payment.notes
    if (!sameSubmission) throw createError({ statusCode: 409, message: 'Cette clé de soumission a déjà été utilisée avec un autre paiement.' })
    const [paymentsResult, invoiceResult] = await Promise.all([
      supabase.from('invoice_payments').select('amount_cents,voided_at').eq('organization_id', input.organizationId).eq('invoice_id', input.invoiceId),
      supabase.from('invoices').select('status').eq('organization_id', input.organizationId).eq('id', input.invoiceId).single(),
    ])
    if (paymentsResult.error || invoiceResult.error) throw createError({ statusCode: 500, message: 'Impossible de relire le paiement déjà enregistré.' })
    const payments = paymentsResult.data
    const currentInvoice = invoiceResult.data
    return {
      created: false,
      payment: existingPayment,
      paidAmountCents: (payments || []).reduce((sum, payment) => sum + (payment.voided_at ? 0 : Number(payment.amount_cents)), 0),
      status: currentInvoice?.status || 'sent',
    }
  }

  const existingManualPayment = await findExistingManualPayment()
  if (existingManualPayment) return existingManualPayment
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id,number,client_id,total_cents,amount_cents,currency,due_at,status')
    .eq('organization_id', input.organizationId)
    .eq('id', input.invoiceId)
    .single()
  if (!invoice) throw createError({ statusCode: 404, message: 'Facture introuvable.' })
  if (invoice.status === 'cancelled') throw createError({ statusCode: 409, message: 'Aucun paiement ne peut être ajouté à un document annulé.' })
  if (input.bankCurrency && input.bankCurrency !== invoice.currency) throw createError({ statusCode: 400, message: 'La devise bancaire ne correspond pas à la facture.' })

  const { data: result, error } = await supabase.rpc('record_invoice_payment_atomic', {
    p_organization_id: input.organizationId,
    p_invoice_id: input.invoiceId,
    p_amount_cents: input.payment.amountCents,
    p_currency: input.bankCurrency || invoice.currency,
    p_method: input.payment.method,
    p_paid_at: input.payment.paidAt,
    p_reference: input.payment.reference,
    p_notes: input.payment.notes,
    p_bank_import_fingerprint: input.bankImportFingerprint || null,
  })
  if (error) {
    const duplicateManualPayment = await findExistingManualPayment()
    if (duplicateManualPayment) return duplicateManualPayment
    if (input.bankImportFingerprint && (error.code === '23505' || error.message.includes('idx_invoice_payments_bank_import_unique'))) {
      throw createError({ statusCode: 409, message: 'Ce mouvement bancaire a déjà été rapproché.' })
    }
    if (error.message.startsWith('payment_exceeds_balance:')) {
      const remainingCents = Number(error.message.split(':')[1] || 0)
      throw createError({ statusCode: 400, message: `Le paiement dépasse le solde restant de ${(remainingCents / 100).toFixed(2)} ${invoice.currency}.` })
    }
    if (error.message === 'currency_mismatch') throw createError({ statusCode: 400, message: 'La devise bancaire ne correspond pas à la facture.' })
    if (error.message === 'invoice_cancelled') throw createError({ statusCode: 409, message: 'Aucun paiement ne peut être ajouté à un document annulé.' })
    if (error.message === 'invoice_not_found') throw createError({ statusCode: 404, message: 'Facture introuvable.' })
    throw createError({ statusCode: 500, message: error.message })
  }
  const atomicResult = result as { payment: { id: number } & Record<string, unknown>, paidAmountCents: number, status: string } | null
  if (!atomicResult?.payment?.id) throw createError({ statusCode: 500, message: 'Le paiement n’a pas pu être enregistré.' })
  const inserted = atomicResult.payment
  const paidAmountCents = Number(atomicResult.paidAmountCents)
  const status = atomicResult.status

  await logAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.source === 'bank_reconciliation' ? 'invoice.bank_payment_reconciled' : 'invoice.payment_recorded',
    entityType: 'invoice',
    entityId: input.invoiceId,
    clientId: invoice.client_id,
    payload: { payment_id: inserted.id, method: input.payment.method, source: input.source || 'manual' },
  })
  if (invoice.client_id) {
    const { data: client } = await supabase.from('clients').select('id,name,email').eq('organization_id', input.organizationId).eq('id', invoice.client_id).maybeSingle()
    if (client?.email) {
      try {
        const siteUrl = String(useRuntimeConfig().public.siteUrl || '').replace(/\/+$/, '')
        const amountLabel = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: invoice.currency }).format(input.payment.amountCents / 100)
        const receipt = await sendTransactionalEmail({
          to: client.email,
          subject: `Paiement enregistré — facture ${invoice.number}`,
          html: portalEmailLayout({
            preview: `Votre paiement de ${amountLabel} a été enregistré.`,
            title: 'Paiement enregistré',
            body: `<p>Bonjour ${escapeEmailHtml(client.name)},</p><p>Votre paiement de <strong>${escapeEmailHtml(amountLabel)}</strong> pour la facture <strong>${escapeEmailHtml(invoice.number)}</strong> a été enregistré.</p>`,
            actionLabel: 'Consulter mes paiements',
            actionUrl: `${siteUrl}/portal#factures`,
          }),
          idempotencyKey: `payment-client-${inserted.id}`,
          tags: [{ name: 'category', value: 'payment_receipt' }],
        })
        await logAudit({ organizationId: input.organizationId, actorUserId: input.actorUserId, action: 'invoice.payment_receipt_sent', entityType: 'invoice', entityId: input.invoiceId, clientId: client.id, payload: { payment_id: inserted.id, email_id: receipt.emailId } })
      }
      catch (notificationError) {
        console.error('[notification] payment receipt failed', notificationError)
        await logAudit({ organizationId: input.organizationId, actorUserId: input.actorUserId, action: 'invoice.payment_receipt_failed', entityType: 'invoice', entityId: input.invoiceId, clientId: client.id, payload: { payment_id: inserted.id } })
      }
    }
  }
  return { created: true, payment: inserted, paidAmountCents, status }
}
