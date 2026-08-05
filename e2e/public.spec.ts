import { expect, test } from '@playwright/test'

test('landing page exposes the main conversion paths', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Antoine Quarroz/i)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /contact|parler|projet/i }).first()).toBeVisible()
})

test('health endpoint reports the application status', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body.status).toBe('ok')
  expect(body.checks?.application).toBe('ok')
  expect(body.checks?.database).toBe('ok')
})

test('admin routes remain protected', async ({ page }) => {
  await page.goto('/admin/crm')
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible()
})
