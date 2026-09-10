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
})
