import { expect, test } from '@playwright/test'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

const accountingSummary = {
  from: '2026-01-01',
  to: '2026-12-31',
  currency: 'CHF',
  totals: { subtotalCents: 10_000, taxCents: 810, totalCents: 10_810, creditNotesCents: 0 },
  vatRows: [{ taxRate: 8.1, taxableCents: 10_000, taxCents: 810, grossCents: 10_810 }],
  collectedByCurrency: { CHF: 10_810 },
  documentCount: 1,
}

test('admin can inspect accounting and create recurring draft schedules', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')

  const createdBodies: unknown[] = []
  await page.route('**/api/admin/accounting-summary**', route => route.fulfill({ json: accountingSummary }))
  await page.route('**/api/admin/recurring-invoices', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [{ id: 1, name: 'Maintenance', cadence: 'monthly', next_issue_date: '2026-09-01', active: true }] })
    createdBodies.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, json: { id: 2 } })
  })
  await page.route('**/api/admin/recurring-invoices/run', route => route.fulfill({ json: { generatedCount: 1, skippedCount: 0 } }))
  await page.route('**/api/clients', route => route.fulfill({ json: [{ id: 12, name: 'Client pilote' }] }))

  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)
  await page.goto('/admin/accounting')

  await expect(page.getByRole('heading', { name: 'Comptabilité' })).toBeVisible()
  await expect(page.getByLabel('Synthèse comptable')).toContainText('108.10')
  await expect(page.getByRole('table')).toContainText('8.1 %')
  await expect(page.getByText(/ne remplace pas une déclaration fiscale officielle/i)).toBeVisible()

  await page.getByLabel('Nom').fill('Support mensuel')
  await page.getByLabel('Client').selectOption('12')
  await page.getByLabel('Montant HT (centimes)').fill('15000')
  await page.getByRole('button', { name: 'Créer la récurrence' }).click()
  await expect.poll(() => createdBodies.length).toBe(1)
  expect(createdBodies[0]).toMatchObject({ clientId: 12, cadence: 'monthly', items: [{ unitPriceCents: 15_000 }] })

  await page.getByRole('button', { name: 'Générer les échéances' }).focus()
  await expect(page.getByRole('button', { name: 'Générer les échéances' })).toBeFocused()

  if (process.env.VISUAL_CAPTURE) {
    await page.screenshot({ path: testInfo.outputPath('aq052-057-accounting-desktop.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: testInfo.outputPath('aq052-057-accounting-mobile.png'), fullPage: true })
  }
})
