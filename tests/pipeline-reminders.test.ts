import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildPipelineReminderPlan } from '../server/utils/pipelineReminderPlan'
import { buildConfirmedPipelineReminderMessage, buildPipelineReminderMessage, confirmationMatchesCandidate, recordProspectReminderSuccess, selectPipelineReminderCandidates, selectPipelineReminderCandidatesForTrigger } from '../server/utils/pipelineReminders'

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

  it('sends only the reminders explicitly confirmed in the dashboard', () => {
    const plan = buildPipelineReminderPlan({
      today: '2026-08-10',
      clients,
      quotes: [{ id: 10, number: 'DEV-10', client_id: 1, valid_until: '2026-08-10', status: 'sent' }],
      invoices: [{ id: 20, number: 'FAC-20', client_id: 1, due_at: '2026-08-10', status: 'sent', balance_cents: 1000 }],
    })

    expect(selectPipelineReminderCandidates(plan.candidates, ['invoice:20:echeance']).map(candidate => candidate.reminderKey)).toEqual([
      'invoice:20:echeance',
    ])
    expect(selectPipelineReminderCandidates(plan.candidates, [])).toEqual([])
  })

  it('locks the recipient while allowing a bounded editable message', () => {
    const plan = buildPipelineReminderPlan({
      today: '2026-08-10',
      clients,
      quotes: [{ id: 10, number: 'DEV-10', title: 'Site', client_id: 1, valid_until: '2026-08-10', status: 'sent' }],
      invoices: [],
    })
    const candidate = plan.candidates[0]!
    const confirmation = {
      reminderKey: candidate.reminderKey,
      email: candidate.email,
      subject: 'Dernier rappel pour le devis DEV-10',
      bodyText: 'Bonjour Client Test,\n\nJe reviens vers vous concernant le devis DEV-10 (Site), valable jusqu’au 2026-08-10.\n\nSi vous souhaitez avancer ou ajuster un point, je reste disponible pour organiser la suite.\n\nAntoine Quarroz\ninfo@antoinequarroz.ch',
    }

    expect(confirmationMatchesCandidate(candidate, confirmation)).toBe(true)
    expect(confirmationMatchesCandidate(candidate, { ...confirmation, email: 'nouvelle-adresse@example.com' })).toBe(false)
    expect(confirmationMatchesCandidate(candidate, { ...confirmation, subject: 'Objet personnalisé', bodyText: `${confirmation.bodyText}\nTexte modifié` })).toBe(true)
    expect(confirmationMatchesCandidate(candidate, { ...confirmation, subject: ' '.repeat(3) })).toBe(false)
    expect(confirmationMatchesCandidate(candidate, { ...confirmation, bodyText: 'x'.repeat(5_001) })).toBe(false)
  })

  it('escapes a customized reminder before generating its HTML', () => {
    const message = buildConfirmedPipelineReminderMessage({
      reminderKey: 'lead:2:relance-2026-09-14',
      email: 'lead@example.com',
      subject: ' Bonjour ',
      bodyText: 'Bonjour <script>alert("x")</script>\nMerci',
    })

    expect(message.subject).toBe('Bonjour')
    expect(message.text).toContain('<script>')
    expect(message.html).not.toContain('<script>')
    expect(message.html).toContain('&lt;script&gt;')
  })

  it('offers due prospects only as manually confirmable reminders', () => {
    const result = buildPipelineReminderPlan({
      today: '2026-09-14',
      clients: [
        { id: 2, name: 'Prospect dû', email: 'due@example.com', status: 'lead', next_follow_up_at: '2026-09-14', follow_up_note: 'Secret interne' },
        { id: 3, name: 'Prospect en retard', email: 'late@example.com', status: 'lead', next_follow_up_at: '2026-09-10' },
        { id: 4, name: 'Prospect futur', email: 'future@example.com', status: 'lead', next_follow_up_at: '2026-09-20' },
        { id: 5, name: 'Client actif', email: 'active@example.com', status: 'active', next_follow_up_at: '2026-09-14' },
      ],
      quotes: [],
      invoices: [],
    })

    expect(result.candidates.map(candidate => [candidate.reminderKey, candidate.urgency])).toEqual([
      ['lead:3:relance-2026-09-10', 'overdue'],
      ['lead:2:relance-2026-09-14', 'due'],
    ])
    expect(result.skipped.outsideMilestone).toBe(1)
  })

  it('keeps the internal prospect note out of text and escaped HTML', () => {
    const candidate = buildPipelineReminderPlan({
      today: '2026-09-14',
      clients: [{
        id: 2,
        name: '<script>alert("x")</script>',
        email: 'lead@example.com',
        status: 'lead',
        next_follow_up_at: '2026-09-14',
        follow_up_note: 'Budget confidentiel : 20 000 CHF',
      }],
      quotes: [],
      invoices: [],
    }).candidates[0]!
    const message = buildPipelineReminderMessage(candidate)

    expect(message.text).not.toContain('Budget confidentiel')
    expect(message.html).not.toContain('<script>')
    expect(message.html).toContain('&lt;script&gt;')
    expect(candidate.hasInternalNote).toBe(true)
  })

  it('invalidates a prospect confirmation when its due date changed', () => {
    const before = buildPipelineReminderPlan({
      today: '2026-09-14',
      clients: [{ id: 2, name: 'Prospect', email: 'lead@example.com', status: 'lead', next_follow_up_at: '2026-09-14' }],
      quotes: [], invoices: [],
    }).candidates[0]!
    const message = buildPipelineReminderMessage(before)
    const confirmation = { reminderKey: before.reminderKey, email: before.email, subject: message.subject, bodyText: message.text }
    const after = buildPipelineReminderPlan({
      today: '2026-09-15',
      clients: [{ id: 2, name: 'Prospect', email: 'lead@example.com', status: 'lead', next_follow_up_at: '2026-09-15' }],
      quotes: [], invoices: [],
    }).candidates[0]!

    expect(confirmationMatchesCandidate(after, confirmation)).toBe(false)
  })

  it('deduplicates a sent prospect follow-up by its dated key', () => {
    const result = buildPipelineReminderPlan({
      today: '2026-09-15',
      clients: [{ id: 2, name: 'Prospect', email: 'lead@example.com', status: 'lead', next_follow_up_at: '2026-09-14' }],
      quotes: [], invoices: [],
      sentReminderKeys: ['lead:2:relance-2026-09-14'],
    })

    expect(result.candidates).toEqual([])
    expect(result.skipped.alreadySent).toBe(1)
  })

  it('never includes prospects in a scheduled run', () => {
    const candidates = buildPipelineReminderPlan({
      today: '2026-09-14',
      clients: [{ id: 2, name: 'Prospect', email: 'lead@example.com', status: 'lead', next_follow_up_at: '2026-09-14' }],
      quotes: [{ id: 10, number: 'DEV-10', client_id: 2, valid_until: '2026-09-14', status: 'sent' }],
      invoices: [],
    }).candidates

    expect(selectPipelineReminderCandidatesForTrigger(candidates, 'manual').map(candidate => candidate.targetType)).toEqual(['quote', 'lead'])
    expect(selectPipelineReminderCandidatesForTrigger(candidates, 'scheduled').map(candidate => candidate.targetType)).toEqual(['quote'])
  })

  it('records a successful prospect contact with organization and preview guards', async () => {
    const candidate = buildPipelineReminderPlan({
      today: '2026-09-14',
      clients: [{ id: 2, name: 'Prospect', email: 'lead@example.com', status: 'lead', next_follow_up_at: '2026-09-14', follow_up_note: 'Ne pas exposer' }],
      quotes: [], invoices: [],
    }).candidates[0]!
    const updates: unknown[] = []
    const audits: unknown[] = []

    await recordProspectReminderSuccess({
      organizationId: 'org-safe',
      actorUserId: 'user-1',
      candidate,
      contactedAt: '2026-09-14T10:00:00.000Z',
    }, {
      updateContact: async (input) => { updates.push(input); return true },
      writeAudit: async (input) => { audits.push(input) },
    })

    expect(updates).toEqual([{
      organizationId: 'org-safe',
      clientId: 2,
      expectedFollowUpDate: '2026-09-14',
      contactedAt: '2026-09-14T10:00:00.000Z',
    }])
    expect(audits).toEqual([expect.objectContaining({
      organizationId: 'org-safe',
      clientId: 2,
      action: 'prospect.follow_up_contacted',
      payload: expect.not.objectContaining({ follow_up_note: expect.anything() }),
    })])
  })

  it('keeps the database contact update tenant-scoped and consumes the expected follow-up atomically', async () => {
    const source = readFileSync(new URL('../server/utils/pipelineReminders.ts', import.meta.url), 'utf8')

    expect(source).toContain(".update({ last_contacted_at: input.contactedAt, next_follow_up_at: null })")
    expect(source).toContain(".eq('organization_id', input.organizationId)")
    expect(source).toContain(".eq('id', input.clientId)")
    expect(source).toContain(".eq('status', 'lead')")
    expect(source).toContain(".eq('next_follow_up_at', input.expectedFollowUpDate)")
  })
})
