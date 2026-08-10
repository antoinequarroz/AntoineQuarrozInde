import { describe, expect, it } from 'vitest'
import { buildPipelineReminderPlan } from '../server/utils/pipelineReminderPlan'

const clients = [{ id: 1, name: 'Client Test', email: 'client@example.com' }]

describe('pipeline reminder plan', () => {
  it('schedules controlled quote and invoice milestones', () => {
    const result = buildPipelineReminderPlan({
      today: '2026-08-10',
      clients,
      quotes: [
        { id: 10, number: 'DEV-10', title: 'Site', client_id: 1, valid_until: '2026-08-13', status: 'sent' },
        { id: 11, number: 'DEV-11', title: 'App', client_id: 1, valid_until: '2026-08-12', status: 'sent' },
      ],
      invoices: [
        { id: 20, number: 'FAC-20', client_id: 1, due_at: '2026-08-12', status: 'sent', balance_cents: 1000 },
        { id: 21, number: 'FAC-21', client_id: 1, due_at: '2026-07-31', status: 'overdue', balance_cents: 2000 },
      ],
    })

    expect(result.candidates.map(candidate => candidate.reminderKey)).toEqual([
      'invoice:21:retard-10j',
      'invoice:20:avant-echeance-2j',
      'quote:10:avant-echeance-3j',
    ])
    expect(result.skipped.outsideMilestone).toBe(1)
  })

  it('deduplicates milestones and reports missing contacts', () => {
    const result = buildPipelineReminderPlan({
      today: '2026-08-10',
      clients: [...clients, { id: 2, name: 'Sans email', email: null }],
      quotes: [{ id: 10, number: 'DEV-10', client_id: 1, valid_until: '2026-08-10', status: 'sent' }],
      invoices: [{ id: 22, number: 'FAC-22', client_id: 2, due_at: '2026-08-10', status: 'sent', balance_cents: 1000 }],
      sentReminderKeys: ['quote:10:echeance'],
    })

    expect(result.candidates).toEqual([])
    expect(result.skipped).toEqual({ alreadySent: 1, missingContact: 1, outsideMilestone: 0, paused: 0 })
  })

  it('does not contact paid or manually paused invoices', () => {
    const result = buildPipelineReminderPlan({
      today: '2026-08-10', clients, quotes: [], invoices: [
        { id: 30, number: 'FAC-30', client_id: 1, due_at: '2026-08-10', status: 'sent', balance_cents: 0 },
        { id: 31, number: 'FAC-31', client_id: 1, due_at: '2026-08-10', status: 'sent', balance_cents: 1000, reminders_paused: true },
      ],
    })
    expect(result.candidates).toEqual([])
    expect(result.skipped.paused).toBe(1)
  })
})
