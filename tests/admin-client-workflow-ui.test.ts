import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('admin client workflow UI', () => {
  it('keeps client and project context on tasks', async () => {
    const page = await readFile('app/pages/admin/tasks/index.vue', 'utf8')
    expect(page).toContain('v-model.number="form.clientId"')
    expect(page).toContain('v-model.number="form.projectId"')
    expect(page).toContain('clientId: form.clientId')
    expect(page).toContain('projectId: form.projectId')
    expect(page).toContain('route.query.clientId')
    expect(page).toContain('route.query.projectId')
  })

  it('does not hide prospects and offers a keyboard status control', async () => {
    const page = await readFile('app/pages/admin/clients/index.vue', 'utf8')
    expect(page).not.toContain("hideLeads: '1'")
    expect(page).toContain("key: 'lead' as const")
    expect(page).toContain('Déplacer dans')
    expect(page).toContain('<option value="lead">Prospect</option>')
  })

  it('lets an operator schedule a bounded internal prospect follow-up', async () => {
    const page = await readFile('app/pages/admin/clients/index.vue', 'utf8')
    expect(page).toContain('Suivi commercial')
    expect(page).toContain('v-model="form.nextFollowUpAt"')
    expect(page).toContain('v-model="form.followUpNote"')
    expect(page).toContain('maxlength="500"')
    expect(page).toContain('nextFollowUpAt: form.nextFollowUpAt || null')
  })

  it('uses real send actions as primary commercial actions', async () => {
    const [quotes, invoices] = await Promise.all([
      readFile('app/pages/admin/quotes/index.vue', 'utf8'),
      readFile('app/pages/admin/invoices/index.vue', 'utf8'),
    ])
    expect(quotes).toContain('@click="sendQuoteEmail(q)"')
    expect(quotes).toContain('Confirmer une signature externe')
    expect(quotes).toContain('Plus d’actions')
    expect(invoices).toContain('@click="sendInvoiceEmail(i)"')
    expect(invoices).toContain('Relancer avec la facture PDF')
    expect(invoices).toContain('Plus d’actions')
  })

  it('announces toast feedback to assistive technologies', async () => {
    const toast = await readFile('app/components/ui/AppToast.vue', 'utf8')
    expect(toast).toContain('aria-live="polite"')
    expect(toast).toContain(`:role="toast.type === 'error' ? 'alert' : 'status'"`)
  })

  it('keeps one visible commercial journey from prospect to payment', async () => {
    const [client, quotes, invoices, payments, journey] = await Promise.all([
      readFile('app/pages/admin/clients/[id].vue', 'utf8'),
      readFile('app/pages/admin/quotes/index.vue', 'utf8'),
      readFile('app/pages/admin/invoices/index.vue', 'utf8'),
      readFile('app/pages/admin/payments/index.vue', 'utf8'),
      readFile('app/components/admin/CommercialJourney.vue', 'utf8'),
    ])
    expect(client).toContain('<AdminCommercialJourney current="crm"')
    expect(quotes).toContain('<AdminCommercialJourney current="quote"')
    expect(invoices).toContain('<AdminCommercialJourney current="invoice"')
    expect(payments).toContain('<AdminCommercialJourney v-if="requestedInvoiceId"')
    expect(payments).toContain(":current=\"contextualEntry ? 'payment' : 'invoice'\"")
    expect(journey).toContain('aria-label="Progression du parcours commercial"')
    expect(journey).toContain('aria-current="step"')
    expect(journey).toContain('aria-disabled="true"')
    expect(journey).toContain('min-h-11')
  })

  it('requires explicit, idempotent commercial transitions without financial audit amounts', async () => {
    const [quotesPage, convertRoute, invoicesPage, paymentRoute, paymentRecorder] = await Promise.all([
      readFile('app/pages/admin/quotes/index.vue', 'utf8'),
      readFile('server/api/quotes/convert.post.ts', 'utf8'),
      readFile('app/pages/admin/invoices/index.vue', 'utf8'),
      readFile('server/api/invoices/payments.post.ts', 'utf8'),
      readFile('server/utils/recordInvoicePayment.ts', 'utf8'),
    ])
    expect(quotesPage).toContain("confirmation: 'ACCEPTER_ET_FACTURER'")
    expect(convertRoute).toContain("body?.confirmation !== 'ACCEPTER_ET_FACTURER'")
    expect(convertRoute).toContain("supabase.rpc('convert_quote_to_invoice_atomic'")
    expect(convertRoute).toContain('if (result.created)')
    expect(convertRoute).not.toContain(".from('invoices').insert")
    expect(invoicesPage).toContain("confirmation: 'ENREGISTRER_PAIEMENT'")
    expect(invoicesPage).toContain('crypto.randomUUID()')
    expect(paymentRoute).toContain("body.confirmation !== 'ENREGISTRER_PAIEMENT'")
    expect(paymentRoute).toContain("update(`manual:${org.id}:${invoiceId}:${idempotencyKey}`)")
    expect(paymentRecorder).toContain('created: false')
    expect(paymentRecorder).toContain('created: true')
    expect(paymentRecorder).toContain('if (!sameSubmission)')
    expect(paymentRecorder).toContain('Cette clé de soumission a déjà été utilisée avec un autre paiement.')
    expect(paymentRecorder).toContain("payload: { payment_id: inserted.id, method: input.payment.method, source: input.source || 'manual' }")
    expect(paymentRecorder).not.toContain('payload: { payment_id: inserted.id, amount_cents:')
  })
})
