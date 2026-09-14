import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('admin CRM daily actions', () => {
  it('keeps every action executable with accessible mobile controls', async () => {
    const page = await readFile('app/pages/admin/crm/index.vue', 'utf8')
    expect(page).toContain("updateCommercialAction(action, 'handled')")
    expect(page).toContain("updateCommercialAction(action, 'snoozed', option.date)")
    expect(page).toContain("updateCommercialAction(action, 'ignored')")
    expect(page).toContain('role="status" aria-live="polite"')
    expect(page).toContain('min-h-11')
    expect(page).not.toContain('transition-all')
  })

  it('requires an explicit Lumail preview confirmation', async () => {
    const page = await readFile('app/pages/admin/crm/index.vue', 'utf8')
    expect(page).toContain('@click="prepareReminder(action)"')
    expect(page).toContain('role="dialog" aria-modal="true" aria-labelledby="crm-reminder-title"')
    expect(page).toContain('Aucun message ne part sans ta confirmation.')
    expect(page).toContain('confirmedReminders: [{')
    expect(page).toContain('@click="sendSelectedReminder"')
    expect(page).toContain('v-model="selectedReminderCandidate.subject"')
    expect(page).toContain('v-model="selectedReminderCandidate.bodyText"')
  })

  it('associates CRM decisions with the tenant-scoped client timeline', async () => {
    const [endpoint, clientPage] = await Promise.all([
      readFile('server/api/admin/commercial-actions.post.ts', 'utf8'),
      readFile('app/pages/admin/clients/[id].vue', 'utf8'),
    ])
    expect(endpoint).toContain(".eq('organization_id', org.id)")
    expect(endpoint).toContain('client_id: clientId')
    expect(endpoint).toContain(".update({ next_follow_up_at: nextDate })")
    expect(endpoint).toContain('aliasActionKey')
    expect(clientPage).toContain("log.action === 'commercial_action.state_changed'")
    expect(clientPage).toContain('Action commerciale traitée')
  })

  it('restores the latest decision without deleting its audit history', async () => {
    const [page, endpoint, clientPage] = await Promise.all([
      readFile('app/pages/admin/crm/index.vue', 'utf8'),
      readFile('server/api/admin/commercial-actions.post.ts', 'utf8'),
      readFile('app/pages/admin/clients/[id].vue', 'utf8'),
    ])
    expect(page).toContain("persistCommercialAction(action, 'restored')")
    expect(page).toContain('Annuler la dernière décision')
    expect(page).toContain('undoCommercialActionButton.value?.focus()')
    expect(endpoint).toContain("action: 'commercial_action.state_changed'")
    expect(clientPage).toContain('Action commerciale restaurée')
  })

  it('plans and summarizes prospect follow-ups with accessible controls', async () => {
    const [page, clientPage] = await Promise.all([
      readFile('app/pages/admin/crm/index.vue', 'utf8'),
      readFile('app/pages/admin/clients/[id].vue', 'utf8'),
    ])
    expect(page).toContain('summarizeCommercialFollowUps')
    expect(page).toContain('Planifier la prochaine relance de')
    expect(page).toContain('aria-labelledby="follow-up-planner-title"')
    expect(page).toContain('data-follow-up-date')
    expect(page).toContain('maxlength="500"')
    expect(page).toContain('Prévisualiser la relance Lumail')
    expect(page).toContain('followUpUpdateFailedCount')
    expect(page).toContain("if (action.kind !== 'lead')")
    expect(clientPage).toContain('Relance prospect envoyée avec Lumail')
    expect(clientPage).toContain('Prochaine relance planifiée')
  })
})
