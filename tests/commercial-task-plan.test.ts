import { describe, expect, it } from 'vitest'
import { buildCommercialTaskSuggestions, summarizeCommercialFollowUps } from '../app/utils/commercialTaskPlan'

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

  it('respects explicit prospect follow-up dates before the inactivity fallback', () => {
    const datedClients = [
      { id: 4, name: 'Planifié', status: 'lead' as const, createdAt: '2026-01-01', nextFollowUpAt: '2026-09-07' },
      { id: 5, name: 'Du jour', status: 'lead' as const, createdAt: '2026-09-05', nextFollowUpAt: '2026-09-06' },
      { id: 6, name: 'En retard', status: 'lead' as const, createdAt: '2026-09-05', nextFollowUpAt: '2026-09-03' },
    ]

    const result = buildCommercialTaskSuggestions({
      today: '2026-09-06',
      clients: datedClients,
      quotes: [],
      invoices: [],
    })

    expect(result.map(item => item.key)).toEqual(['lead:6_2026-09-03', 'lead:5_2026-09-06'])
    expect(result[0]).toMatchObject({
      label: 'Relance en retard',
      priority: 'high',
      dueDate: '2026-09-03',
      daysDelta: -3,
    })
    expect(result[1]).toMatchObject({
      label: 'Relance aujourd’hui',
      priority: 'medium',
      dueDate: '2026-09-06',
      daysDelta: 0,
    })
  })

  it('keeps the existing inactivity fallback only when no valid explicit date exists', () => {
    const result = buildCommercialTaskSuggestions({
      today: '2026-09-06',
      clients: [
        { id: 7, name: 'Fallback', status: 'lead', createdAt: '2026-08-20', nextFollowUpAt: null },
        { id: 8, name: 'Date invalide', status: 'lead', createdAt: '2026-08-20', nextFollowUpAt: 'invalide' },
      ],
      quotes: [],
      invoices: [],
    })

    expect(result.map(item => item.key)).toEqual(['lead:7', 'lead:8'])
    expect(result.every(item => item.label === 'Prospect inactif')).toBe(true)
  })

  it('summarizes scheduled, due today and overdue prospect follow-ups', () => {
    expect(summarizeCommercialFollowUps({
      today: '2026-09-06',
      clients: [
        { id: 4, name: 'Planifié', status: 'lead', createdAt: '2026-01-01', nextFollowUpAt: '2026-09-07' },
        { id: 5, name: 'Du jour', status: 'lead', createdAt: '2026-01-01', nextFollowUpAt: '2026-09-06' },
        { id: 6, name: 'En retard', status: 'lead', createdAt: '2026-01-01', nextFollowUpAt: '2026-09-03' },
        { id: 7, name: 'Sans date', status: 'lead', createdAt: '2026-01-01' },
        { id: 8, name: 'Client actif', status: 'active', createdAt: '2026-01-01', nextFollowUpAt: '2026-09-03' },
      ],
    })).toEqual({ scheduled: 1, today: 1, overdue: 1 })
  })

  it('lets a restored explicit follow-up reappear while a handled one stays hidden', () => {
    const dueClient = {
      id: 9,
      name: 'À restaurer',
      status: 'lead' as const,
      createdAt: '2026-09-05',
      nextFollowUpAt: '2026-09-06',
    }
    const input = {
      today: '2026-09-06',
      clients: [dueClient],
      quotes: [],
      invoices: [],
    }

    expect(buildCommercialTaskSuggestions({
      ...input,
      existingTaskTitles: ['[RELANCE PROSPECT 9 2026-09-06]'],
    })).toEqual([])
    expect(buildCommercialTaskSuggestions(input).map(item => item.key)).toEqual(['lead:9_2026-09-06'])
  })

  it('uses a due explicit follow-up even when the prospect has an active quote', () => {
    const result = buildCommercialTaskSuggestions({
      today: '2026-09-06',
      clients: [{
        id: 10,
        name: 'Prospect avec devis',
        status: 'lead',
        createdAt: '2026-09-05',
        nextFollowUpAt: '2026-09-06',
      }],
      quotes: [{
        id: 12,
        number: 'DEV-12',
        title: 'Projet',
        clientId: 10,
        status: 'accepted',
        issuedAt: '2026-09-01',
        validUntil: '2026-09-30',
        createdAt: '2026-09-01',
      }],
      invoices: [],
    })

    expect(result.map(item => item.key)).toEqual(['lead:10_2026-09-06'])
  })

  it('starts the inactivity fallback from the last confirmed contact', () => {
    const result = buildCommercialTaskSuggestions({
      today: '2026-09-14',
      clients: [{
        id: 11,
        name: 'Contact récent',
        status: 'lead',
        createdAt: '2026-01-01',
        lastContactedAt: '2026-09-12T08:30:00.000Z',
      }],
      quotes: [],
      invoices: [],
    })

    expect(result).toEqual([])
  })

  it('deduplicates only the dated prospect occurrence represented by a task', () => {
    const baseClient = { id: 12, name: 'Relance récurrente', status: 'lead' as const, createdAt: '2026-01-01' }
    expect(buildCommercialTaskSuggestions({
      today: '2026-09-14',
      clients: [{ ...baseClient, nextFollowUpAt: '2026-09-14' }],
      quotes: [],
      invoices: [],
      existingTaskTitles: ['[RELANCE PROSPECT 12 2026-09-14]'],
    })).toEqual([])

    expect(buildCommercialTaskSuggestions({
      today: '2026-09-21',
      clients: [{ ...baseClient, nextFollowUpAt: '2026-09-21' }],
      quotes: [],
      invoices: [],
      existingTaskTitles: ['[RELANCE PROSPECT 12 2026-09-14]'],
    }).map(item => item.key)).toEqual(['lead:12_2026-09-21'])
  })
})
