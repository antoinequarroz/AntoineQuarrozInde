import { expect, test, type Page } from '@playwright/test'
import { navigateToFixtureHomepage } from './helpers/fixtureHomepage'

test.describe.configure({ retries: 0 })

const originalArtwork = [
  'https://raw.githubusercontent.com/antoinequarroz/lifxp/main/assets/brand/lifxp-ui-direction.png',
  'https://remembeyes.expo.app/assets/assets/images/demo-contact-sheet.e5c717eb137491492e784a22cb8ee1cf.png',
]
const categories = ['web', 'mobile', 'cms', 'software']
const projects = Array.from({ length: 8 }, (_, index) => ({
  id: 9100 + index,
  title: `Portfolio fixture ${index + 1}`,
  slug: `portfolio-fixture-${index + 1}`,
  category: categories[index % categories.length],
  tags: ['Vue', 'TypeScript'],
  description: `A public project used to verify portfolio browsing ${index + 1}.`,
  image: originalArtwork[index] || `https://portfolio-fixtures.invalid/project-${index + 1}.png`,
  live_url: `https://portfolio-fixtures.invalid/demo-${index + 1}`,
  code_url: `https://portfolio-fixtures.invalid/code-${index + 1}`,
  featured: true,
  portfolio_visible: true,
  created_at: `2026-10-${String(20 - index).padStart(2, '0')}`,
}))

function isPortfolioImage(url: string) {
  return originalArtwork.includes(url)
    || url.includes('/portfolio-previews/')
    || /^https:\/\/portfolio-fixtures\.invalid\/project-\d+\.png$/.test(url)
}

async function openFixtureHomepage(page: Page) {
  const imageRequests: string[] = []
  page.on('request', request => {
    if (isPortfolioImage(request.url())) imageRequests.push(request.url())
  })
  await page.route('**/api/marketing-event', route => route.fulfill({ json: { ok: true } }))
  await page.route('**/api/projects', route => route.fulfill({ json: projects }))
  // All homepage dependencies participate in its async navigation. Keep the
  // portfolio fixture independent of a live article database or Google API.
  await page.route('**/api/public/articles?*', route => route.fulfill({ json: [] }))
  await page.route('**/api/reviews', route => route.fulfill({ json: [] }))
  await page.route('**/api/google-reviews?*', route => route.fulfill({ json: { configured: false, reviews: [] } }))
  await page.route('https://portfolio-fixtures.invalid/**', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect width="480" height="300" fill="#7c3aed"/></svg>',
  }))

  // The public API runs server-side on a direct homepage load. Enter through
  // the real home link so its client-side GET can use deterministic fixtures
  // without changing a database or depending on production project rows.
  const fixtureResponse = await navigateToFixtureHomepage(page, '/api/projects')
  expect(await fixtureResponse.json()).toEqual(projects)
  await expect(page.locator('[data-mobile-project-card]')).toHaveCount(projects.length)
  await expect(page.locator('[data-mobile-project-carousel]')).toHaveAttribute('data-carousel-ready', 'true')
  await expect.poll(() => page.locator('#portfolio').evaluate(element => element.getBoundingClientRect().top))
    .toBeGreaterThan(2 * (page.viewportSize()?.height || 800))
  // Give native lazy loading and the approach observer time to reveal any
  // accidental request from hidden desktop cards or distant mobile cards.
  await page.waitForTimeout(600)
  expect(imageRequests).toEqual([])
  return imageRequests
}

async function approachPortfolio(page: Page) {
  await page.locator('#portfolio').evaluate(element => window.scrollTo({
    top: element.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2,
    behavior: 'instant',
  }))
}

async function scrollMobileProject(page: Page, index: number) {
  const carousel = page.locator('[data-mobile-project-carousel]')
  await carousel.scrollIntoViewIfNeeded()
  await carousel.evaluate((list, targetIndex) => {
    const card = list.querySelectorAll<HTMLElement>('[data-mobile-project-card]')[targetIndex]
    if (!card) throw new Error(`Project ${targetIndex} is absent`)
    const cardRect = card.getBoundingClientRect()
    const listRect = list.getBoundingClientRect()
    list.scrollTo({
      left: list.scrollLeft + cardRect.left - listRect.left - (list.clientWidth - cardRect.width) / 2,
      behavior: 'instant',
    })
  }, index)
  await expect(page.locator('[data-mobile-project-card]').nth(index)).toHaveAttribute('aria-current', 'true')
  await expect.poll(() => carousel.evaluate((list, targetIndex) => {
    const card = list.querySelectorAll<HTMLElement>('[data-mobile-project-card]')[targetIndex]!
    const cardRect = card.getBoundingClientRect()
    const listRect = list.getBoundingClientRect()
    return Math.abs(cardRect.left + cardRect.width / 2 - listRect.left - list.clientWidth / 2)
  }, index)).toBeLessThanOrEqual(2)
}

test('mobile portfolio fetches previews on approach and as its cards are browsed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const requests = await openFixtureHomepage(page)
  await approachPortfolio(page)

  const carousel = page.locator('[data-mobile-project-carousel]')
  const cards = carousel.locator('[data-mobile-project-card]')
  await expect(carousel.locator('img')).toHaveCount(2)
  await expect(page.locator('[data-helix-card] img')).toHaveCount(0)
  await expect.poll(() => cards.first().locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
  expect(requests.some(url => /lifxp.*480\.webp$/.test(url))).toBe(true)
  expect(requests.some(url => /remembeyes.*480\.webp$/.test(url))).toBe(true)
  expect(requests.filter(url => originalArtwork.includes(url))).toEqual([])
  expect(requests.some(url => url.includes('/project-6.png'))).toBe(false)

  await scrollMobileProject(page, 5)
  await expect(carousel.locator('img')).toHaveCount(3)
  await expect.poll(() => cards.nth(5).locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
  expect(requests.some(url => url.includes('/project-6.png'))).toBe(true)
  await expect(cards.nth(5).locator('a[href^="/projets/"]'))
    .toHaveAttribute('href', '/projets/portfolio-fixture-6')

  // Changing orientation/layout must warm the now-visible desktop helix while
  // removing the mobile image path, rather than leaving a blank carousel.
  await page.setViewportSize({ width: 1440, height: 900 })
  await approachPortfolio(page)
  await expect(page.locator('[data-project-navigation]')).toBeVisible()
  await expect(carousel.locator('img')).toHaveCount(0)
  await expect.poll(() => page.locator('[data-helix-card] img').count()).toBeGreaterThan(0)
})

test('desktop portfolio stays deferred and keeps project navigation and filters usable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const requests = await openFixtureHomepage(page)
  await approachPortfolio(page)

  const navigation = page.locator('[data-project-navigation]')
  await expect(navigation).toBeVisible()
  await expect(page.locator('[data-mobile-project-carousel] img')).toHaveCount(0)
  await expect.poll(() => page.locator('[data-helix-card] img').count()).toBeGreaterThan(0)
  expect(requests.some(url => url.includes('/project-5.png'))).toBe(false)
  await navigation.getByRole('button', { name: /Portfolio fixture 5/ }).click()
  await expect(navigation.getByRole('button', { name: /Portfolio fixture 5/ })).toHaveAttribute('aria-current', 'true')
  await expect.poll(() => page.locator('[data-helix-card]').nth(4).locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
  expect(requests.some(url => url.includes('/project-5.png'))).toBe(true)

  await page.locator('#portfolio').getByRole('button', { name: /mobile/i }).first().click()
  await expect(page.locator('[data-helix-card]')).toHaveCount(2)
  await expect(navigation.getByRole('button')).toHaveCount(2)
  await expect(navigation.getByRole('button').first()).toHaveAttribute('aria-current', 'true')
  await expect.poll(() => page.locator('[data-helix-card]').first().locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
  await navigation.getByRole('button').nth(1).click()
  await expect(navigation.getByRole('button').nth(1)).toHaveAttribute('aria-current', 'true')
  await expect.poll(() => page.locator('[data-helix-card]').nth(1).locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
})

test('reduced motion uses the horizontal portfolio without loading its hidden helix', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openFixtureHomepage(page)
  await approachPortfolio(page)

  const carousel = page.locator('[data-mobile-project-carousel]')
  await expect(carousel).toBeVisible()
  await expect(page.locator('[data-helix-card]')).toHaveCount(0)
  await expect(carousel.locator('img')).toHaveCount(2)
  // Wide horizontal cards must receive the large preview even at DPR 1.
  await expect.poll(() => carousel.locator('[data-mobile-project-card]').first().locator('img')
    .evaluate(image => (image as HTMLImageElement).currentSrc)).toMatch(/\/lifxp-0b05f10e-800\.webp$/)
  await scrollMobileProject(page, 5)
  await expect(carousel.locator('img')).toHaveCount(3)
  await expect.poll(() => carousel.locator('[aria-current="true"] img').evaluate(image => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
})
