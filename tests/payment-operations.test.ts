import { describe, expect, it } from 'vitest'
import { buildPaymentOperations } from '../server/utils/paymentOperations'

describe('payment operations cockpit', () => {
  const now = new Date('2026-08-10T18:00:00.000Z')
  const clients = [{ id: 7, name: 'Client pilote', company: null }]
  const invoices = [
    { id: 42, client_id: 7, number: 'FAC-42', total_cents: 10_000, currency: 'CHF', status: 'overdue', document_type: 'invoice', due_at: '2026-08-01' },
    { id: 43, client_id: 7, number: 'AV-43', total_cents: 1_000, currency: 'CHF', status: 'sent', document_type: 'credit_note' },
  ]

  it('calculates collected, outstanding and overdue amounts without credit notes or voided payments', () => {
    const result = buildPaymentOperations({
      now,
      clients,
      invoices,
      payments: [
        { id: 1, invoice_id: 42, amount_cents: 4_000, currency: 'CHF', method: 'twint', paid_at: '2026-08-10', created_at: '2026-08-10T10:00:00Z', voided_at: null },
        { id: 2, invoice_id: 42, amount_cents: 1_000, currency: 'CHF', method: 'cash', paid_at: '2026-08-09', created_at: '2026-08-09T10:00:00Z', voided_at: '2026-08-09T11:00:00Z' },
        { id: 3, invoice_id: 43, amount_cents: 1_000, currency: 'CHF', method: 'other', paid_at: '2026-08-08', created_at: '2026-08-08T10:00:00Z', voided_at: null },
      ],
      sessions: [],
    })

    expect(result.metrics).toMatchObject({ collectedCents: 4_000, collectedThisMonthCents: 4_000, outstandingCents: 6_000, overdueCents: 6_000, attentionCount: 1 })
    expect(result.alerts[0]).toMatchObject({ kind: 'overdue_invoice', amountCents: 6_000, invoiceId: 42 })
  })

  it('flags stale checkout sessions and keeps one chronological journal', () => {
    const result = buildPaymentOperations({
      now,
      clients,
      invoices: [{ ...invoices[0], status: 'sent' }],
      payments: [{ id: 1, invoice_id: 42, amount_cents: 2_000, currency: 'CHF', method: 'twint', paid_at: '2026-08-10', created_at: '2026-08-10T15:00:00Z', voided_at: null }],
      sessions: [
        { id: 9, invoice_id: 42, client_id: 7, provider: 'stripe', provider_session_id: 'cs_open', amount_cents: 8_000, currency: 'CHF', status: 'created', expires_at: '2026-08-11T12:00:00Z', created_at: '2026-08-10T16:00:00Z' },
        { id: 8, invoice_id: 42, client_id: 7, provider: 'stripe', provider_session_id: 'cs_stale', amount_cents: 8_000, currency: 'CHF', status: 'created', expires_at: '2026-08-10T17:00:00Z', created_at: '2026-08-10T14:00:00Z' },
      ],
    })

    expect(result.metrics).toMatchObject({ activeSessions: 1, attentionCount: 1 })
    expect(result.alerts[0]).toMatchObject({ kind: 'stale_checkout', invoiceId: 42 })
    expect(result.entries.map(entry => [entry.id, entry.status])).toEqual([
      ['checkout-9', 'open'],
      ['payment-1', 'confirmed'],
      ['checkout-8', 'expired'],
    ])
  })

  it('requires every database query in the API to remain organization-scoped', async () => {
    const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../server/api/admin/payment-operations.get.ts', import.meta.url), 'utf8'))
    expect(source.match(/\.eq\('organization_id', org\.id\)/g)).toHaveLength(4)
    expect(source).toContain('requireAdmin(event)')
    expect(source).not.toContain('message: queryError.message')
  })
})
