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
  live_url: index === 0 ? null : `https://portfolio-fixtures.invalid/demo-${index + 1}`,
  code_url: index === 0 ? null : `https://portfolio-fixtures.invalid/code-${index + 1}`,
  featured: true,
  portfolio_visible: true,
  created_at: `2026-10-${String(20 - index).padStart(2, '0')}`,
}))

function isPortfolioImage(url: string) {
  return originalArtwork.includes(url)
    || url.includes('/portfolio-previews/')
    || /^https:\/\/portfolio-fixtures\.invalid\/project-\d+\.png$/.test(url)
}

async function openFixtureHomepage(page: Page, fixtureProjects = projects) {
  const imageRequests: string[] = []
  page.on('request', request => {
    if (isPortfolioImage(request.url())) imageRequests.push(request.url())
  })
  await page.route('**/ingest/**', route => route.fulfill({ json: {} }))
  await page.route('**/api/marketing-event', route => route.fulfill({ json: { ok: true } }))
  await page.route('**/api/projects', route => route.fulfill({ json: fixtureProjects }))
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
  expect(await fixtureResponse.json()).toEqual(fixtureProjects)
  const startsInGrid = (page.viewportSize()?.width ?? 1280) < 768
  await expect(page.locator(`[data-portfolio-view="${startsInGrid ? 'grid' : 'helix'}"]`))
    .toHaveAttribute('aria-pressed', 'true')
  if (startsInGrid) {
    await expect(page.locator('[data-project-grid-card]')).toHaveCount(fixtureProjects.length)
    await expect(page.locator('[data-mobile-project-carousel], [data-helix-card]')).toHaveCount(0)
  }
  else {
    await expect(page.locator('[data-mobile-project-card]')).toHaveCount(fixtureProjects.length)
    await expect(page.locator('[data-mobile-project-carousel]')).toHaveAttribute('data-carousel-ready', 'true')
  }
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
  await page.locator('[data-portfolio-view="helix"]').click()
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

test('a portfolio project with private demo and source keeps its public page without external buttons', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openFixtureHomepage(page)
  await approachPortfolio(page)

  const card = page.locator('[data-project-grid-card]').first()
  await expect(card.locator('a[target="_blank"]')).toHaveCount(0)
  await card.locator('a[href="/projets/portfolio-fixture-1"]').click()

  await expect(page).toHaveURL(/\/projets\/portfolio-fixture-1$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Portfolio fixture 1' })).toBeVisible()
  await expect(page.locator('main a[target="_blank"]')).toHaveCount(0)
  await expect(page.getByText(projects[0]!.description, { exact: true })).toBeVisible()
})

const presentationProjects = [
  { ...projects[0]!, title: 'Client presentation fixture', slug: 'physiobaur' },
  { ...projects[1]!, title: 'Personal presentation fixture', slug: 'postmelo', live_url: null, code_url: null },
  { ...projects[2]!, title: 'Unclassified presentation fixture', slug: 'unclassified-example' },
  // Keep the unclassified example away from the scroll boundary: this helper
  // also verifies exact centering, which an end card cannot always reach.
  { ...projects[3]!, title: 'Trailing presentation fixture', slug: 'trailing-example' },
]

test('desktop portfolio keeps one explanatory panel and updates explicit project badges', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openFixtureHomepage(page, presentationProjects)
  await approachPortfolio(page)

  const panel = page.locator('[data-project-main-panel]')
  await expect(panel).toBeVisible()
  await expect(panel.getByText('Projet client', { exact: true })).toBeVisible()
  await expect(panel.getByText(presentationProjects[0]!.description, { exact: true })).toBeVisible()
  const preview = page.locator('[data-helix-content]').first()
  await expect(preview).toContainText(presentationProjects[0]!.description)
  await expect(preview.getByRole('list', { name: 'Technologies' })).toContainText('TypeScript')
  await expect(preview.getByRole('link')).toHaveCount(0)
  await expect(page.locator('[data-helix-image]').first().locator('img')).toHaveCSS('object-fit', 'cover')

  const navigation = page.locator('[data-project-navigation]')
  await navigation.getByRole('button', { name: /Personal presentation fixture/ }).click()
  await expect(panel.getByRole('heading')).toHaveText('Personal presentation fixture')
  await expect(panel.getByText('Projet personnel', { exact: true })).toBeVisible()
  await expect(panel.getByText('En développement', { exact: true })).toBeVisible()
  await expect(panel.locator('a[target="_blank"]')).toHaveCount(0)
  await expect(panel.getByRole('link', { name: 'Découvrir le projet', exact: true }))
    .toHaveAttribute('href', '/projets/postmelo')
  await expect(panel.getByRole('link', { name: 'Découvrir le projet', exact: true }))
    .toHaveCSS('min-height', '44px')

  await navigation.getByRole('button', { name: /Unclassified presentation fixture/ }).click()
  await expect(panel.getByRole('heading')).toHaveText('Unclassified presentation fixture')
  await expect(panel.locator('[data-project-badges]')).toHaveCount(0)
})

for (const reducedMotion of [false, true]) {
  test(`project badges remain visible in the ${reducedMotion ? 'reduced-motion' : 'mobile'} portfolio`, async ({ page }) => {
    await page.setViewportSize(reducedMotion ? { width: 1280, height: 800 } : { width: 390, height: 844 })
    if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' })
    await openFixtureHomepage(page, presentationProjects)
    if (!reducedMotion) await page.locator('[data-portfolio-view="helix"]').click()
    await approachPortfolio(page)

    const cards = page.locator('[data-mobile-project-card]')
    await expect(cards.first().getByText('Projet client', { exact: true })).toBeVisible()
    await scrollMobileProject(page, 1)
    await expect(cards.nth(1).getByText('Projet personnel', { exact: true })).toBeVisible()
    await expect(cards.nth(1).getByText('En développement', { exact: true })).toBeVisible()
    await expect(cards.nth(1).locator('a[target="_blank"]')).toHaveCount(0)
    await expect(cards.nth(1).getByRole('link', { name: 'Découvrir le projet', exact: true }))
      .toHaveAttribute('href', '/projets/postmelo')
    await scrollMobileProject(page, 2)
    await expect(cards.nth(2).locator('[data-project-badges]')).toHaveCount(0)
  })
}

for (const count of [17, 21, 30]) {
  test(`front portfolio cards stay separated with ${count} fixture projects and a filtered selection`, async ({ page }) => {
    const fixtureProjects = Array.from({ length: count }, (_, index) => ({
      ...projects[index % projects.length]!,
      id: 9500 + index,
      title: `Spacing fixture ${index + 1}`,
      slug: `spacing-fixture-${index + 1}`,
      category: index < 3 ? 'mobile' : 'web',
      image: `https://portfolio-fixtures.invalid/project-${index + 1}.png`,
    }))
    await page.setViewportSize({ width: 900, height: 820 })
    await openFixtureHomepage(page, fixtureProjects)

    async function expectSeparated(visibleCount: number, viewport: { width: number, height: number }) {
      const cards = page.locator('[data-helix-card]')
      await expect(cards).toHaveCount(visibleCount)
      await expect(page.locator('[data-project-navigation]')).toBeVisible()
      const track = cards.first().locator('xpath=ancestor::div[contains(@style, "height")][1]')
      const metrics = await track.evaluate((element) => ({
        top: element.getBoundingClientRect().top + window.scrollY,
        height: (element as HTMLElement).offsetHeight,
      }))
      const stickyTop = viewport.width >= 1280 ? 96 : 80
      const end = -Math.max(viewport.height, metrics.height - viewport.height * 1.02)
      const transition = 1 / (visibleCount - 1)
      for (const progress of [0, 0.25 * transition, 0.5 * transition, 0.75 * transition, transition, 0.5, 0.75, 1]) {
        await page.evaluate(({ top, progress, stickyTop, end }) => {
          window.scrollTo({ top: top - stickyTop + progress * (stickyTop - end), behavior: 'instant' })
        }, { top: metrics.top, progress, stickyTop, end })
        await page.waitForTimeout(100)
        const overlap = await cards.evaluateAll((elements) => {
          const [first, second] = elements.map(element => ({
            opacity: Number.parseFloat(getComputedStyle(element).opacity),
            rect: element.getBoundingClientRect(),
          })).sort((a, b) => b.opacity - a.opacity).slice(0, 2)
          if (!first || !second) throw new Error('Two front cards are required')
          return {
            x: Math.min(first.rect.right, second.rect.right) - Math.max(first.rect.left, second.rect.left),
            y: Math.min(first.rect.bottom, second.rect.bottom) - Math.max(first.rect.top, second.rect.top),
          }
        })
        expect(overlap.x <= 0 || overlap.y <= 0,
          `${count} projects (${visibleCount} selected), ${viewport.width}px, progress ${progress}: ${overlap.x}px × ${overlap.y}px overlap`).toBeTruthy()
        if (count === 21 && visibleCount === count && viewport.width === 900 && progress === 0) {
          await page.screenshot({ path: test.info().outputPath('portfolio-21-projects-900px.png') })
        }
      }
    }

    for (const viewport of [{ width: 768, height: 820 }, { width: 900, height: 820 }, { width: 1280, height: 900 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport)
      await expectSeparated(count, viewport)
    }
    await page.locator('#portfolio').getByRole('button', { name: /mobile/i }).first().click()
    for (const viewport of [{ width: 900, height: 820 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport)
      await expectSeparated(3, viewport)
    }
  })
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`portfolio grid shares filters and returns to browsing at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await openFixtureHomepage(page, presentationProjects)
    await approachPortfolio(page)
    const toolbar = page.locator('[data-portfolio-toolbar]')
    const gridButton = toolbar.getByRole('button', { name: 'Grille', exact: true })
    const helixButton = toolbar.locator('[data-portfolio-view="helix"]')
    await expect(viewport.width < 768 ? gridButton : helixButton).toHaveAttribute('aria-pressed', 'true')
    await gridButton.focus()
    await page.keyboard.press('Enter')
    await expect(gridButton).toBeFocused()
    await expect(gridButton).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-helix-card], [data-mobile-project-carousel]')).toHaveCount(0)
    const cards = page.locator('[data-project-grid-card]')
    await expect(cards).toHaveCount(presentationProjects.length)
    await expect(cards.first().getByRole('heading')).toHaveText('Client presentation fixture')
    await expect(cards.first().getByText('Projet client', { exact: true })).toBeVisible()
    await expect(cards.nth(1).getByText('Projet personnel', { exact: true })).toBeVisible()
    await expect(cards.nth(1).getByText('En développement', { exact: true })).toBeVisible()
    await expect(cards.nth(1).getByRole('link')).toHaveAttribute('href', '/projets/postmelo')
    await expect(cards.locator('a[target="_blank"]')).toHaveCount(0)
    await expect(cards.first().locator('img')).toHaveAttribute('loading', 'lazy')
    await expect(cards.first().locator('img')).toHaveAttribute('sizes', /46vw/)
    await expect(cards.first().getByRole('link')).toHaveCSS('min-height', '44px')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await toolbar.getByRole('button', { name: /Mobile/ }).click()
    await expect(cards).toHaveCount(1)
    await expect(cards.first().getByRole('heading')).toHaveText('Personal presentation fixture')
    await helixButton.click()
    await expect(helixButton).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-project-grid]')).toHaveCount(0)
    if (viewport.width >= 768) {
      await expect(page.locator('[data-project-main-panel] h3')).toHaveText('Personal presentation fixture')
      await expect(page.locator('[data-helix-card]')).toHaveCount(1)
    }
    else {
      await expect(page.locator('[data-mobile-project-card]')).toHaveCount(1)
      await expect(page.locator('[data-mobile-project-card] h3')).toHaveText('Personal presentation fixture')
    }
    await gridButton.click()
    await expect(cards).toHaveCount(1)
    await toolbar.getByRole('button', { name: /^Tous/ }).click()
    await expect(cards).toHaveCount(presentationProjects.length)

    // A responsive default must not override a visitor's subsequent choice.
    await page.setViewportSize(viewport.width < 768 ? { width: 1440, height: 900 } : { width: 390, height: 844 })
    await expect(gridButton).toHaveAttribute('aria-pressed', 'true')
    await expect(cards).toHaveCount(presentationProjects.length)
    await helixButton.click()
    await page.setViewportSize(viewport)
    await expect(helixButton).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-project-grid]')).toHaveCount(0)
    await expect(page.locator(viewport.width < 768 ? '[data-mobile-project-carousel]' : '[data-project-navigation]')).toBeVisible()
  })
}

test('the grid switch stays reachable deep in the helix without clamping to the page footer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openFixtureHomepage(page)
  await approachPortfolio(page)
  const navigation = page.locator('[data-project-navigation]')
  await navigation.getByRole('button', { name: /Portfolio fixture 6/ }).click()
  await expect(navigation.getByRole('button', { name: /Portfolio fixture 6/ })).toHaveAttribute('aria-current', 'true')
  const toolbar = page.locator('[data-portfolio-toolbar]')
  await expect(toolbar).toBeInViewport()
  await toolbar.getByRole('button', { name: 'Grille', exact: true }).click()
  await expect(page.locator('[data-project-grid-card]')).toHaveCount(8)
  await expect(toolbar).toBeInViewport()
  await expect(page.locator('[data-project-grid-card]').first()).toBeInViewport()
  const firstImage = page.locator('[data-project-grid-card]').first().locator('img')
  await expect.poll(() => firstImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(page.locator('[data-project-grid]')).toHaveCSS('grid-template-columns', /\S+ \S+ \S+/)
})

test('reduced motion can switch to the grid and keeps honest view labels', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openFixtureHomepage(page)
  await approachPortfolio(page)
  const toolbar = page.locator('[data-portfolio-toolbar]')
  await expect(toolbar.getByRole('button', { name: 'Défilement', exact: true })).toBeVisible()
  await toolbar.getByRole('button', { name: 'Grille', exact: true }).click()
  await expect(page.locator('[data-project-grid-card]')).toHaveCount(8)
  await expect(page.locator('[data-helix-card]')).toHaveCount(0)
  await toolbar.getByRole('button', { name: 'Défilement', exact: true }).click()
  await expect(page.locator('[data-mobile-project-carousel]')).toBeVisible()
  await expect(page.locator('[data-project-grid]')).toHaveCount(0)
})
