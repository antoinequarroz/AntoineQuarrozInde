import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { adminCredentialsConfigured, loginAdmin } from './helpers/admin-auth'

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  const blocking = results.violations.filter(violation => violation.impact === 'critical' || violation.impact === 'serious')
  expect(blocking, blocking.map(violation => `${violation.id}: ${violation.help}`).join('\n')).toEqual([])
}

async function selectSandboxOrganization(page: Page) {
  const organizationSelect = page.getByRole('combobox', { name: 'Organisation active' })
  if (!await organizationSelect.isVisible()) return
  const sandboxOption = organizationSelect.locator('option', { hasText: 'AQ E2E Sandbox' })
  if (!await sandboxOption.count()) return
  const sandboxId = await sandboxOption.first().getAttribute('value') || ''
  if (await organizationSelect.inputValue() !== sandboxId) {
    await Promise.all([
      page.waitForNavigation(),
      organizationSelect.selectOption(sandboxId),
    ])
  }
  await page.reload()
  await expect(organizationSelect).toHaveValue(sandboxId)
}

test('landing and admin login remain accessible without credentials', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toBeVisible()
  await expect(page.locator(':focus')).not.toHaveJSProperty('tagName', 'BODY')
  await expectNoSeriousAccessibilityViolations(page)

  await page.goto('/admin/login')
  await expect(page.getByLabel(/email/i)).toBeEnabled()
  await expect(page.getByLabel(/mot de passe/i)).toBeEnabled()
  await page.getByLabel(/email/i).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel(/mot de passe/i)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /se connecter/i })).toBeFocused()
  await expectNoSeriousAccessibilityViolations(page)
})

test('all admin workspaces have no serious accessibility violations', async ({ page }) => {
  test.skip(!adminCredentialsConfigured, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
  test.setTimeout(180_000)

  await loginAdmin(page)
  await selectSandboxOrganization(page)

  const routes = [
    '/admin',
    '/admin/crm',
    '/admin/clients',
    '/admin/projects',
    '/admin/tasks',
    '/admin/quotes',
    '/admin/invoices',
    '/admin/payments',
    '/admin/accounting',
    '/admin/appointments',
    '/admin/articles',
    '/admin/reviews',
    '/admin/messages',
    '/admin/analytics',
    '/admin/audit',
    '/admin/errors',
  ]

  const violationsByRoute: string[] = []

  for (const route of routes) {
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    for (const violation of results.violations.filter(item => item.impact === 'critical' || item.impact === 'serious')) {
      const targets = violation.nodes.flatMap(node => node.target.map(target => String(target))).join(', ')
      violationsByRoute.push(`${route} · ${violation.id} · ${targets}`)
    }
  }

  expect(violationsByRoute, violationsByRoute.join('\n')).toEqual([])
})
