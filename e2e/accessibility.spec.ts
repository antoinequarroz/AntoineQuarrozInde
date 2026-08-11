import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  const blocking = results.violations.filter(violation => violation.impact === 'critical' || violation.impact === 'serious')
  expect(blocking, blocking.map(violation => `${violation.id}: ${violation.help}`).join('\n')).toEqual([])
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
