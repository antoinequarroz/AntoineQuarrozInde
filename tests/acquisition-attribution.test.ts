import { describe, expect, it } from 'vitest'
import { aggregateAcquisitionAttribution } from '../server/utils/acquisitionAttribution'

describe('acquisition revenue attribution', () => {
  it('connects client sources to accepted quotes and collected payments', () => {
    const result = aggregateAcquisitionAttribution(
      [
        { id: 1, status: 'active', acquisition_source: 'instagram' },
        { id: 2, status: 'lead', acquisition_source: ' instagram ' },
        { id: 3, status: 'active', acquisition_source: null },
      ],
      [
        { client_id: 1, status: 'accepted', total_cents: 12_500 },
        { client_id: 1, status: 'accepted', total_cents: 2_500 },
        { client_id: 2, status: 'sent', total_cents: 9_000 },
        { client_id: 3, status: 'accepted', total_cents: 20_000 },
      ],
      [
        { id: 10, client_id: 1, document_type: 'invoice', status: 'sent', total_cents: 12_500 },
        { id: 11, client_id: 3, document_type: 'invoice', status: 'sent', total_cents: 20_000 },
        { id: 12, client_id: 1, document_type: 'credit_note', status: 'sent', total_cents: 1_000 },
        { id: 13, client_id: 1, document_type: 'invoice', status: 'paid', total_cents: 3_000 },
      ],
      [
        { invoice_id: 10, amount_cents: 5_000, voided_at: null },
        { invoice_id: 10, amount_cents: 2_500, voided_at: '2026-08-09T10:00:00Z' },
        { invoice_id: 11, amount_cents: 20_000, voided_at: null },
        { invoice_id: 12, amount_cents: 1_000, voided_at: null },
      ],
    )

    expect(result.attribution).toEqual([
      { source: 'Non attribué', leads: 1, activeClients: 1, acceptedQuotes: 1, acceptedQuoteCents: 20_000, collectedRevenueCents: 20_000, leadToQuoteRate: 100 },
      { source: 'instagram', leads: 2, activeClients: 1, acceptedQuotes: 2, acceptedQuoteCents: 15_000, collectedRevenueCents: 8_000, leadToQuoteRate: 50 },
    ])
    expect(result.commercialTotals).toEqual({ leads: 3, activeClients: 2, acceptedQuotes: 3, acceptedQuoteCents: 35_000, collectedRevenueCents: 28_000 })
  })

  it('normalizes direct traffic and ignores orphaned commercial records', () => {
    const result = aggregateAcquisitionAttribution(
      [{ id: 1, status: 'lead', acquisition_source: 'direct' }],
      [{ client_id: 99, status: 'accepted', total_cents: 1_000 }],
      [{ id: 10, client_id: null, document_type: 'invoice' }],
      [{ invoice_id: 10, amount_cents: 1_000, voided_at: null }],
    )

    expect(result.attribution).toEqual([
      { source: 'Direct', leads: 1, activeClients: 0, acceptedQuotes: 0, acceptedQuoteCents: 0, collectedRevenueCents: 0, leadToQuoteRate: 0 },
    ])
  })
})
