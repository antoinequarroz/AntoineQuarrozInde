import { expect, type Page } from '@playwright/test'

export async function waitForAdminLoginReady(page: Page) {
  // Nuxt's cold dev compilation can outlive the default 5s assertion budget.
  // Wait for the real mounted form; never force input into a disabled field.
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByLabel(/email/i)).toBeEnabled()
}
