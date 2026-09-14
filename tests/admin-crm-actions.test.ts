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
  })

  it('associates CRM decisions with the tenant-scoped client timeline', async () => {
    const [endpoint, clientPage] = await Promise.all([
      readFile('server/api/admin/commercial-actions.post.ts', 'utf8'),
      readFile('app/pages/admin/clients/[id].vue', 'utf8'),
    ])
    expect(endpoint).toContain(".eq('organization_id', org.id)")
    expect(endpoint).toContain('client_id: clientId')
    expect(clientPage).toContain("log.action === 'commercial_action.state_changed'")
    expect(clientPage).toContain('Action commerciale traitée')
  })
})
