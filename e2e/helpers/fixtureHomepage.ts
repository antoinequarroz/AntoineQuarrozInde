import { expect, type Page } from '@playwright/test'

// Direct SSR requests cannot be intercepted by browser fixtures. Enter via a
// hydrated public link and wait for Nuxt's own navigation/scroll restoration.
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
  await page.evaluate(() => {
    const app = (document.querySelector('#__nuxt') as HTMLElement & {
      __vue_app__?: { $nuxt?: {
        hooks: { hookOnce: (name: string, callback: () => void) => void }
        '~transitionPromise'?: Promise<unknown>
      } }
    })?.__vue_app__?.$nuxt
    if (!app) throw new Error('Nuxt is not ready for fixture navigation')
    ;(window as Window & { fixtureNavigationReady?: Promise<void> }).fixtureNavigationReady = new Promise(resolve => {
      app.hooks.hookOnce('page:loading:end', () => {
        void Promise.resolve(app['~transitionPromise']).then(() => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
      })
    })
  })
  const [response] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === apiPath
      && response.request().method() === 'GET'),
    homeLink.press('Enter'),
  ])
  await page.evaluate(() => (window as Window & { fixtureNavigationReady?: Promise<void> }).fixtureNavigationReady)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  return response
}
