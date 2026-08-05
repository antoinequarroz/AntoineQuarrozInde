import { expect, test } from '@playwright/test'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test('authenticated admin can reach CRM, quotes and invoices', async ({ page }) => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)

  await page.goto('/admin/crm')
  await expect(page.getByRole('heading', { name: /carnet d'adresses/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pipeline' })).toBeVisible()

  await page.goto('/admin/quotes')
  await expect(page.getByRole('heading', { name: 'Devis', exact: true })).toBeVisible()
  await page.goto('/admin/invoices')
  await expect(page.getByRole('heading', { name: 'Factures', exact: true })).toBeVisible()
})
