import { expect, type Page } from '@playwright/test'

// Direct SSR requests cannot be intercepted by browser fixtures. Enter via a
// hydrated public link and observe the rendered destination/scroll position.
export async function navigateToFixtureHomepage(page: Page, apiPath: string) {
  await page.goto('/mentions-legales', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#mobile-menu-trigger')).toBeEnabled()
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as HTMLElement & {
      __vue_app__?: { $nuxt?: { isHydrating: boolean } }
    })?.__vue_app__
    return app?.$nuxt?.isHydrating === false
  })
  const homeLink = page.getByRole('link', { name: /^AQ —/ })
  await expect(homeLink).toBeVisible()
  await homeLink.focus()
  const [response] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === apiPath
      && response.request().method() === 'GET'),
    homeLink.press('Enter'),
  ])
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('#hero').getByRole('heading', { level: 1 })).toBeVisible()
  // Nuxt's private promise describes the old page's leave, not the destination's
  // settled entry. Waiting on that handle hung in CI; observe the actual page
  // and scroll position instead, including when transitions are reduced.
  await expect(page.locator('.page-enter-active, .page-leave-active')).toHaveCount(0)
  await page.waitForFunction(async () => {
    for (let frame = 0; frame < 3; frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      if (window.scrollY !== 0 || document.querySelector('.page-enter-active, .page-leave-active')) return false
    }
    return true
  })
  return response
}
