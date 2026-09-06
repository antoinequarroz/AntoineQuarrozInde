import { describe, expect, it } from 'vitest'
import { buildCommercialTaskSuggestions } from '../app/utils/commercialTaskPlan'

const clients = [
  { id: 1, name: 'Prospect ancien', status: 'lead' as const, createdAt: '2026-08-20' },
  { id: 2, name: 'Prospect récent', status: 'lead' as const, createdAt: '2026-09-03' },
  { id: 3, name: 'Client actif', status: 'active' as const, createdAt: '2026-07-01' },
]

describe('commercial task plan', () => {
  it('proposes only actionable leads, quotes and unpaid invoices', () => {
    const result = buildCommercialTaskSuggestions({
      today: '2026-09-06',
      clients,
      quotes: [
        { id: 10, number: 'DEV-10', title: 'Site', clientId: 3, status: 'sent', issuedAt: '2026-08-30', validUntil: '2026-09-07', createdAt: '2026-08-30' },
        { id: 11, number: 'DEV-11', title: 'App', clientId: 2, status: 'draft', issuedAt: null, validUntil: null, createdAt: '2026-09-03' },
      ],
      invoices: [
        { id: 20, number: 'FAC-20', clientId: 3, status: 'sent', dueAt: '2026-09-04', amountCents: 100_000, totalCents: 108_100, paidAmountCents: 10_000 },
        { id: 21, number: 'FAC-21', clientId: 3, status: 'paid', dueAt: '2026-09-04', amountCents: 100_000, paidAmountCents: 100_000 },
      ],
    })

    expect(result.map(item => item.key)).toEqual(['invoice:20', 'lead:1', 'quote:10'])
    expect(result[0]).toMatchObject({ priority: 'high', dueDate: '2026-09-06', label: 'Facture en retard' })
  })

  it('does not duplicate existing tasks or paused reminders', () => {
    const result = buildCommercialTaskSuggestions({
      today: '2026-09-06',
      clients,
      quotes: [{ id: 10, number: 'DEV-10', title: 'Site', clientId: 1, status: 'sent', issuedAt: '2026-08-30', validUntil: '2026-09-07', createdAt: '2026-08-30' }],
      invoices: [{ id: 20, number: 'FAC-20', clientId: 3, status: 'overdue', dueAt: '2026-09-01', amountCents: 100_000, paidAmountCents: 0, remindersPaused: true }],
      existingTaskTitles: ['[RELANCE DEVIS DEV-10]'],
    })

    expect(result).toEqual([])
  })

  it('waits five days before following a sent quote without validity date', () => {
    const baseQuote = { id: 10, number: 'DEV-10', title: 'Site', clientId: 3, status: 'sent' as const, issuedAt: '2026-09-02', validUntil: null, createdAt: '2026-09-02' }
    expect(buildCommercialTaskSuggestions({ today: '2026-09-06', clients, quotes: [baseQuote], invoices: [] })).toEqual([
      expect.objectContaining({ key: 'lead:1' }),
    ])
    expect(buildCommercialTaskSuggestions({ today: '2026-09-07', clients, quotes: [baseQuote], invoices: [] }).map(item => item.key)).toContain('quote:10')
  })
})
