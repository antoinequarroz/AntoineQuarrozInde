import { expect, test } from '@playwright/test'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

const overview = {
  organization: { name: 'AQ E2E Sandbox' },
  client: { id: 7, name: 'Camille Exemple', company: 'Atelier Exemple' },
  projects: [{
    id: 21,
    title: 'Portail de réservation',
    category: 'web',
    description: 'Un espace clair pour gérer les réservations et les échanges avec les clients.',
    live_url: 'https://example.com',
    milestones: [
      { id: 1, title: 'Design validé', due_at: '2026-08-01', status: 'done' },
      { id: 2, title: 'Développement du portail', due_at: '2026-08-20', status: 'in_progress' },
      { id: 3, title: 'Mise en production', due_at: '2026-09-01', status: 'pending' },
    ],
    deliverables: [{ id: 1, title: 'Maquettes finales', url: 'https://example.com/maquettes', status: 'delivered' }],
    notes: [{ id: 1, kind: 'meeting', title: 'Compte rendu du point hebdomadaire', content: 'Le parcours principal est validé.', occurred_at: '2026-08-08' }],
  }],
  quotes: [{ id: 42, number: 'DEV-2026-0042', title: 'Évolution du portail', total_cents: 125_000, currency: 'CHF', status: 'sent', issued_at: '2026-08-05', valid_until: '2026-08-31' }],
  invoices: [{
    id: 51,
    number: 'FAC-2026-0051',
    total_cents: 54_050,
    paid_amount_cents: 20_000,
    currency: 'CHF',
    status: 'sent',
    document_type: 'invoice',
    issued_at: '2026-08-06',
    due_at: '2026-09-05',
    payments: [{ id: 1, amount_cents: 20_000, currency: 'CHF', method: 'bank_transfer', paid_at: '2026-08-09' }],
  }],
  payments: { twintAvailable: true },
}

test('client portal V2 exposes projects, decisions, deliverables and payments', async ({ page }, testInfo) => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')

  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)

  await page.route('**/api/portal/overview', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overview) }))
  await page.route('**/api/portal/quotes/accept', async (route) => {
    const request = route.request()
    const body = request.postDataJSON() as { quoteId: number, confirmed: boolean }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accepted: body.confirmed, quoteId: body.quoteId }),
    })
  })

  await page.goto('/portal')
  await expect(page.getByRole('heading', { name: 'Votre collaboration, clairement suivie.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vos projets' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Maquettes finales', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vos devis' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Factures et paiements' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('portal-v2-desktop.png'), fullPage: true })

  await page.getByRole('button', { name: 'Accepter', exact: true }).click()
  await expect(page.getByText('Confirmer l’acceptation de ce devis ?')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmer ma décision' }).click()
  await expect(page.getByText('Accepté', { exact: true })).toBeVisible()
  await expect(page.locator('#quote-pdf-42')).toBeFocused()

  await page.getByText('Historique des paiements (1)').click()
  await expect(page.getByText(/Virement bancaire/)).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByRole('heading', { name: 'Votre collaboration, clairement suivie.' })).toBeVisible()
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(hasHorizontalOverflow).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('portal-v2-mobile.png'), fullPage: true })
})
