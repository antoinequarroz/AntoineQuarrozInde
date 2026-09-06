import { expect, test } from '@playwright/test'
import { adminCredentialsConfigured, loginAdmin } from './helpers/admin-auth'

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
  test.skip(!adminCredentialsConfigured, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')

  const createdBodies: unknown[] = []
  let delayNextSummary = false
  await page.route('**/api/admin/accounting-summary**', async (route) => {
    if (delayNextSummary) {
      delayNextSummary = false
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    await route.fulfill({ json: accountingSummary })
  })
  await page.route('**/api/admin/recurring-invoices', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [{ id: 1, name: 'Maintenance', cadence: 'monthly', next_issue_date: '2026-09-01', active: true }] })
    createdBodies.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, json: { id: 2 } })
  })
  await page.route('**/api/admin/recurring-invoices/run', route => route.fulfill({ json: { generatedCount: 1, skippedCount: 0 } }))
  await page.route('**/api/clients', route => route.fulfill({ json: [{ id: 12, name: 'Client pilote' }] }))

  await loginAdmin(page)
  await page.goto('/admin/accounting')

  await expect(page.getByRole('heading', { name: 'Comptabilité' })).toBeVisible()
  await expect(page.getByLabel('Synthèse comptable')).toContainText('108.10')
  await expect(page.getByRole('table')).toContainText('8.1 %')
  await expect(page.getByText(/ne remplace pas une déclaration fiscale officielle/i)).toBeVisible()

  delayNextSummary = true
  await page.getByLabel('Du', { exact: true }).fill('2025-01-01')
  await page.getByRole('button', { name: 'Actualiser' }).click()
  await page.getByLabel('Du', { exact: true }).fill('2024-01-01')
  await expect(page.getByRole('button', { name: 'Actualiser' })).toBeEnabled()
  await expect(page.getByText(/Période modifiée/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Exporter CSV' })).toBeDisabled()
  await expect(page.getByText(/Documents CHF émis du .*2025/)).toBeVisible()

  await page.getByLabel('Nom').fill('Support mensuel')
  await page.getByLabel('Client').selectOption('12')
  await page.getByLabel('Montant HT (CHF)').fill('150')
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
