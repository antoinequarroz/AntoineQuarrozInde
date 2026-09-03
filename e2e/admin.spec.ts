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
  const organizationSelect = page.getByRole('combobox', { name: 'Organisation active' })
  if (await organizationSelect.isVisible()) await organizationSelect.selectOption({ label: 'AQ E2E Sandbox (manager)' })

  await page.goto('/admin/crm')
  await expect(page.getByRole('heading', { name: /carnet d'adresses/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pipeline' })).toBeVisible()

  await page.goto('/admin/quotes')
  await expect(page.getByRole('heading', { name: 'Devis', exact: true })).toBeVisible()
  await page.goto('/admin/invoices')
  await expect(page.getByRole('heading', { name: 'Factures', exact: true })).toBeVisible()

  await page.goto('/admin/clients')
  await page.getByRole('combobox', { name: 'Organisation active' }).selectOption({ label: 'AQ E2E Sandbox (manager)' })
  await expect(page.getByRole('button', { name: 'Nouveau' })).toBeVisible()
  await page.getByRole('button', { name: 'Nouveau' }).click()
  await expect(page.getByRole('group', { name: 'Acquisition' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Source' })).toBeVisible()
  await page.getByRole('button', { name: 'Annuler' }).click()

  await page.goto('/admin/projects')
  await page.getByRole('combobox', { name: 'Organisation active' }).selectOption({ label: 'AQ E2E Sandbox (manager)' })
  await page.getByRole('button', { name: 'Nouveau' }).click()
  await expect(page.getByRole('group', { name: 'Publication' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Afficher dans le portfolio/ })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: /Publier l’étude de cas/ })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: /Mettre en avant/ })).toBeEnabled()
  await page.getByRole('button', { name: 'Annuler' }).click()

  await page.goto('/admin')
  await page.getByRole('combobox', { name: 'Organisation active' }).selectOption({ label: 'AQ E2E Sandbox (manager)' })
  await expect(page.getByRole('heading', { name: 'Automatisation' })).toBeVisible()
  await expect(page.getByText(/jalons anti-spam/i)).toBeVisible()
})
