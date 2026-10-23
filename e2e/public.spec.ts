import { expect, test, type Page } from '@playwright/test'

async function openServiceSlideshow(page: Page) {
  const marketingEvents: Array<{ event?: string, metadata?: Record<string, unknown> }> = []
  await page.route('**/api/marketing-event', (route) => {
    marketingEvents.push(route.request().postDataJSON())
    return route.fulfill({ json: { ok: true } })
  })
  await page.route('**/ingest/**', route => route.fulfill({ json: {} }))
  await page.goto('/#services')
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as HTMLElement & {
      __vue_app__?: { $nuxt?: { isHydrating: boolean } }
    })?.__vue_app__
    return app?.$nuxt?.isHydrating === false
  })
  await expect(page.locator('#services').getByRole('tablist')).toBeVisible()
  return marketingEvents
}

test('landing page exposes the main conversion paths', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Antoine Quarroz/i)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /contact|parler|projet/i }).first()).toBeVisible()
})

test.describe('reduced-motion page navigation', () => {
  test.describe.configure({ retries: 0 })

  test('replaces the old page and restores normal transitions when the preference changes', async ({ page }) => {
    const hydrationWarnings: string[] = []
    page.on('console', message => {
      if (/hydration.*mismatch/i.test(message.text())) hydrationWarnings.push(message.text())
    })
    await page.route('**/api/marketing-event', route => route.fulfill({ json: { ok: true } }))
    await page.route('**/api/projects', route => route.fulfill({ json: [] }))
    await page.route('**/api/public/articles?*', route => route.fulfill({ json: [] }))
    await page.route('**/api/reviews', route => route.fulfill({ json: [] }))
    await page.route('**/api/google-reviews?*', route => route.fulfill({ json: { configured: false, reviews: [] } }))

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/mentions-legales', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#mobile-menu-trigger')).toBeEnabled()
    await page.evaluate(() => {
      const scope = window as Window & { pageTransitionsObserved?: number }
      scope.pageTransitionsObserved = 0
      new MutationObserver(() => {
        if (document.querySelector('#main-content .page-enter-active, #main-content .page-leave-active')) {
          scope.pageTransitionsObserved! += 1
        }
      }).observe(document.querySelector('#main-content')!, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
    })

    const homeLink = page.getByRole('link', { name: /^AQ —/ })
    await homeLink.press('Enter')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('#hero h1')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mentions légales', exact: true })).toHaveCount(0)
    await page.getByRole('link', { name: 'Mentions légales', exact: true }).click()
    await expect(page).toHaveURL(/\/mentions-legales$/)
    await expect(page.getByRole('heading', { name: 'Mentions légales', exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    expect(await page.evaluate(() => (window as Window & { pageTransitionsObserved?: number }).pageTransitionsObserved)).toBe(0)

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await homeLink.press('Enter')
    await expect(page.locator('#hero h1')).toBeVisible()
    await expect.poll(() => page.evaluate(() => (window as Window & { pageTransitionsObserved?: number }).pageTransitionsObserved || 0)).toBeGreaterThan(0)
    await expect(page.locator('.page-enter-active, .page-leave-active')).toHaveCount(0)
    expect(hydrationWarnings).toEqual([])
  })
})

test('hero remains usable without JavaScript and with reduced motion', async ({ browser }) => {
  const noScriptContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
  const noScriptPage = await noScriptContext.newPage()
  const response = await noScriptPage.goto('/')
  expect(response?.ok()).toBeTruthy()
  await expect(noScriptPage.locator('[data-hero-critical-content] h1')).toBeVisible()
  await expect(noScriptPage.locator('[data-hero-primary-cta]')).toHaveAttribute('href', /^\/(?:en|de)?#contact$/)
  await expect(noScriptPage.locator('[data-hero-secondary-cta]')).toHaveAttribute('href', /^\/(?:en|de)?#portfolio$/)
  await noScriptContext.close()

  const reducedContext = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } })
  const reducedPage = await reducedContext.newPage()
  await reducedPage.goto('/')
  await expect(reducedPage.locator('[data-spline-state="fallback-motion"]')).toBeVisible()
  const primary = reducedPage.locator('[data-hero-primary-cta]')
  await primary.focus()
  await expect(primary).toBeFocused()
  await expect(primary).toBeInViewport()
  await reducedContext.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto('/')
  await expect(mobilePage.locator('[data-hero-spline-frame]')).toBeHidden()
  await expect(mobilePage.locator('img[src="/hero-robot-mobile.png"]')).toHaveCount(0)
  const splineRuntimeLoaded = await mobilePage.evaluate(() => performance
    .getEntriesByType('resource')
    .some(entry => entry.name.includes('@splinetool/viewer')))
  expect(splineRuntimeLoaded).toBeFalsy()
  await mobileContext.close()
})

test('mobile navigation keeps preferences inside the burger menu', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')

    await expect(page.locator('[data-desktop-nav-preferences]')).toBeHidden()
    await expect(page.locator('[data-mobile-nav-preferences]')).toHaveCount(0)
    await expect(page.locator('#mobile-menu-trigger')).toBeVisible()

    await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as HTMLElement & { __vue_app__?: unknown })?.__vue_app__))
    await page.locator('#mobile-menu-trigger').click()
    await expect(page.locator('#mobile-menu-trigger')).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('[data-mobile-nav-preferences]')).toBeVisible()
    await expect(page.locator('[data-mobile-nav-preferences] summary')).toBeVisible()
    await expect(page.locator('[data-mobile-nav-preferences] button')).toBeVisible()
  }
})

test.describe('service slideshow', () => {
  test.describe.configure({ retries: 0 })

  test('keyboard changes the selected service and exposes only its related panel', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openServiceSlideshow(page)
    const section = page.locator('#services')
    const vitrine = section.locator('[data-service-tab="vitrine"]')
    const cms = section.locator('[data-service-tab="cms"]')
    const mobile = section.locator('[data-service-tab="mobile"]')

    await expect(section.getByRole('tab')).toHaveCount(3)
    await expect(vitrine).toHaveAttribute('aria-selected', 'true')
    await vitrine.focus()
    await vitrine.press('ArrowRight')
    await expect(cms).toBeFocused()
    await expect(cms).toHaveAttribute('aria-selected', 'true')
    await expect(cms).toHaveAttribute('aria-controls', 'service-panel-cms')
    await expect(section.getByRole('tabpanel')).toHaveCount(1)
    await expect(section.getByRole('tabpanel')).toHaveAttribute('id', 'service-panel-cms')
    await expect(section.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'service-tab-cms')

    await cms.press('End')
    await expect(mobile).toBeFocused()
    await expect(mobile).toHaveAttribute('aria-selected', 'true')
    await mobile.press('Home')
    await expect(vitrine).toBeFocused()
    await vitrine.press('ArrowLeft')
    await expect(mobile).toBeFocused()
    await expect(mobile).toHaveAttribute('aria-selected', 'true')
    await expect(section.getByRole('tab', { selected: true })).toHaveCount(1)
    await expect(mobile).toHaveAttribute('tabindex', '0')
    await expect(vitrine).toHaveAttribute('tabindex', '-1')
    await expect(cms).toHaveAttribute('tabindex', '-1')
    await expect(section.getByRole('tabpanel')).toHaveAttribute('id', 'service-panel-mobile')

    // A passing pointer must not hide the panel while its contact action owns
    // keyboard focus. Explicitly choosing another service must still work.
    await mobile.press('Tab')
    const panel = section.getByRole('tabpanel')
    await expect(panel).toBeFocused()
    await panel.press('Tab')
    const contactAction = panel.locator('[data-service-cta="mobile"]')
    await expect(contactAction).toBeFocused()
    await vitrine.hover()
    await expect(contactAction).toBeFocused()
    await expect(mobile).toHaveAttribute('aria-selected', 'true')
    await expect(panel).toHaveAttribute('id', 'service-panel-mobile')
    await vitrine.click()
    await expect(vitrine).toHaveAttribute('aria-selected', 'true')
    await expect(section.getByRole('tabpanel')).toHaveAttribute('id', 'service-panel-vitrine')
  })

  for (const width of [320, 390]) {
    test(`touch can select every service without overflow at ${width}px`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
      })
      try {
        const page = await context.newPage()
        await openServiceSlideshow(page)
        const section = page.locator('#services')
        for (const key of ['cms', 'vitrine', 'mobile']) {
          const tab = section.locator(`[data-service-tab="${key}"]`)
          await tab.tap()
          await expect(tab).toHaveAttribute('aria-selected', 'true')
          const panel = section.getByRole('tabpanel')
          await expect(panel).toHaveCount(1)
          await expect(panel).toHaveAttribute('id', `service-panel-${key}`)
          await expect(panel.locator(`[data-service-cta="${key}"]`)).toBeVisible()
          const targets = await section.locator('[role="tab"], [data-service-cta]').evaluateAll(elements => elements
            .filter(element => !element.closest('[hidden], [inert]'))
            .map(element => {
              const { width, height } = element.getBoundingClientRect()
              return { width, height }
            }))
          expect(targets.every(target => target.width >= 44 && target.height >= 44)).toBe(true)
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
        }
      }
      finally { await context.close() }
    })
  }

  test('the chosen service opens contact with its selection and one attributed click', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const contactRequests: string[] = []
    await page.route('**/api/contact', (route) => {
      contactRequests.push(route.request().method())
      return route.fulfill({ status: 500, json: { error: 'Unexpected contact submission in a browsing test' } })
    })
    const events = await openServiceSlideshow(page)
    const section = page.locator('#services')
    const cms = section.locator('[data-service-tab="cms"]')
    await cms.focus()
    await cms.press('Enter')
    const cta = section.getByRole('tabpanel').locator('[data-service-cta="cms"]')
    await expect(cta).toHaveAttribute('href', '/#contact-form')
    await cta.click()

    await expect(page).toHaveURL(/#contact-form$/)
    await expect(page.locator('#contact-form form')).toBeVisible()
    await expect(page.locator('#contact-form [role="status"]')).toContainText('Solutions CMS')
    await expect(page.locator('#contact-name')).toBeFocused()
    await expect.poll(() => events.filter(event => event.event === 'services_cta_click'))
      .toHaveLength(1)
    expect(events.find(event => event.event === 'services_cta_click')?.metadata?.service).toBe('cms')
    // Browsing services and opening the form must not send a contact request.
    expect(contactRequests).toEqual([])
  })

  test('reduced motion keeps service changes immediate and usable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openServiceSlideshow(page)
    const section = page.locator('#services')
    await section.locator('[data-service-tab="mobile"]').click()
    await expect(section.getByRole('tabpanel')).toHaveAttribute('id', 'service-panel-mobile')
    await expect(section.locator('[data-service-cta="mobile"]')).toBeVisible()
    const motion = await section.getByRole('tabpanel').evaluate(element => element.getAnimations({ subtree: true })
      .filter(animation => animation.playState === 'running' || animation.pending)
      .map(animation => animation.effect?.getComputedTiming().activeDuration || 0))
    expect(motion.every(duration => Number(duration) <= 1)).toBe(true)
    await section.locator('[data-service-tab="vitrine"]').click()
    await expect(section.getByRole('tabpanel')).toHaveAttribute('id', 'service-panel-vitrine')
  })
})

async function expectTouchFriendlyTargets(page: Page) {
  const smallTargets = await page.locator('a, button, input, select, textarea').evaluateAll(elements => (
    elements
      .map((element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return {
          label: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 60),
          width: rect.width,
          height: rect.height,
          visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
        }
      })
      .filter(target => target.visible && (target.width < 44 || target.height < 44))
  ))

  expect(smallTargets).toEqual([])
}

test('mobile landing keeps every visible interactive target touch friendly', async ({ page, browser }) => {
  const viewport = { width: 390, height: 844 }
  // The server-rendered first paint must also be usable before hydration.
  const serverContext = await browser.newContext({ javaScriptEnabled: false, viewport })
  try {
    const serverPage = await serverContext.newPage()
    await serverPage.goto('/')
    await expectTouchFriendlyTargets(serverPage)
  }
  finally { await serverContext.close() }

  await page.setViewportSize(viewport)
  await page.goto('/')
  await expectTouchFriendlyTargets(page)
  await expect(page.locator('.video-scroll-hero__controls button').first()).toBeVisible()
  await expectTouchFriendlyTargets(page)
})

test('mobile presentation loads only its responsive preview and waits to load the film', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const mediaRequests: string[] = []
  page.on('request', request => {
    if (request.url().includes('/videos/presentation/')) mediaRequests.push(request.url())
  })
  await page.goto('/')
  await expect(page.locator('.video-scroll-hero__controls button').first()).toBeVisible()
  expect(mediaRequests.filter(url => url.endsWith('.mp4'))).toEqual([])
  expect(mediaRequests.some(url => /affiche-paysage\./.test(url))).toBe(false)

  await page.locator('#presentation').scrollIntoViewIfNeeded()
  const preview = page.locator('#presentation picture img')
  await expect.poll(() => preview.evaluate(image => (image as HTMLImageElement).currentSrc))
    .toContain('affiche-portrait.webp')
  await expect.poll(() => preview.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  expect(mediaRequests.some(url => /affiche-paysage\./.test(url))).toBe(false)
  expect(mediaRequests.filter(url => url.endsWith('.mp4'))).toEqual([])

  const movieRequest = page.waitForRequest(request => request.url().endsWith('/antoine-portrait.mp4'))
  await page.locator('#presentation .about-film__start').click()
  await movieRequest
  await expect(page.locator('#presentation video')).toHaveAttribute('poster', '/videos/presentation/affiche-portrait.webp')
  expect(mediaRequests.some(url => url.endsWith('/antoine-paysage.mp4'))).toBe(false)
})

test('analytics failure never blocks the primary contact path', async ({ page }) => {
  await page.route('**/api/marketing-event', route => route.abort())
  await page.goto('/')
  await page.locator('[data-hero-primary-cta]').click()
  await expect(page).toHaveURL(/#contact$/)
  await expect(page.locator('#contact-form')).toBeVisible()
})

test('contact exposes the integrated Cal.com booking with a direct fallback URL', async ({ page }) => {
  await page.goto('/#contact')

  const booking = page.getByRole('link', { name: /choisir un créneau|choose a time|termin auswählen/i })
  await expect(booking).toHaveAttribute('href', 'https://cal.com/antoine-quarroz-ilnim4/30min')
  await expect(booking).toHaveAttribute('data-cal-link', 'antoine-quarroz-ilnim4/30min')
  await expect(booking).toHaveAttribute('data-cal-namespace', 'portfolio-contact')
})

test('diagnostic contact form keeps only the useful fields at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/#contact')

  const form = page.locator('#contact-form form')
  await expect(form).toHaveCount(0)
  const openForm = page.getByRole('button', { name: /recevoir un premier avis|get an initial assessment|erste einschätzung erhalten/i })
  await expect(openForm).toBeEnabled()
  await page.waitForTimeout(500)
  await openForm.click()
  await expect(form).toBeVisible()
  await expect(form.getByLabel(/nom|name/i)).toBeFocused()
  await expect(form.getByLabel(/nom|name/i)).toHaveAttribute('required', '')
  await expect(page.getByLabel(/e-?mail/i)).toHaveAttribute('required', '')
  await expect(page.getByLabel(/quel problème|what problem|welches problem/i)).toHaveAttribute('required', '')
  await expect(page.getByLabel(/entreprise|company|unternehmen/i)).toBeVisible()
  await expect(page.getByLabel(/entreprise|company|unternehmen/i)).not.toHaveAttribute('required', '')
  await expect(page.getByLabel(/budget indicatif|estimated budget|budgetrahmen/i)).toHaveCount(0)
  await expect(page.getByLabel(/délai cible|target timeline|gewünschter zeitrahmen/i)).toHaveCount(0)
})

test('mobile portfolio starts in the grid and keeps horizontal browsing available', { tag: '@live-data' }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#portfolio')

  await expect(page.locator('[data-portfolio-view="grid"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-project-grid-card]').first()).toBeVisible()
  await expect(page.locator('[data-mobile-project-carousel]')).toHaveCount(0)
  await page.locator('[data-portfolio-view="helix"]').click()
  const carousel = page.locator('[data-mobile-project-carousel]')
  const cards = carousel.locator('[data-mobile-project-card]')
  await expect(carousel).toBeVisible()
  await expect(carousel).toHaveAttribute('data-carousel-ready', 'true')
  await expect(page.getByText(/Faites glisser pour explorer|Drag to explore|Ziehen zum Entdecken/)).toBeVisible()
  expect(await cards.count()).toBeGreaterThan(1)
  await expect(cards.first()).toHaveAttribute('aria-current', 'true')
  await expect(page.getByLabel(/Projet 1 sur \d+|Project 1 of \d+|Projekt 1 von \d+/)).toBeVisible()
  await expect(carousel.locator('a[target="_blank"]').first()).toBeVisible()

  await carousel.evaluate((element) => {
    element.scrollTo({ left: element.clientWidth, behavior: 'instant' })
  })
  await expect.poll(async () => cards.nth(1).getAttribute('aria-current')).toBe('true')
  await expect(page.getByLabel(/Projet 2 sur \d+|Project 2 of \d+|Projekt 2 von \d+/)).toBeVisible()
})

test('front portfolio cards stay separated and navigation follows the active project', { tag: '@live-data' }, async ({ page }) => {
  for (const viewport of [{ width: 900, height: 820 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/#portfolio')
    const cards = page.locator('[data-helix-card]')
    const navigation = page.locator('[data-project-navigation]')
    await expect(cards.first()).toBeVisible()
    await expect.poll(async () => Boolean(await cards.first().evaluate(element => (
      (element as HTMLElement).style.transform
    )))).toBe(true)

    const track = cards.first().locator('xpath=ancestor::div[contains(@style, "height")][1]')
    const trackMetrics = await track.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return {
        top: rect.top + window.scrollY,
        height: (element as HTMLElement).offsetHeight,
        viewportHeight: window.innerHeight,
      }
    })
    const stickyTop = viewport.width >= 1280 ? 96 : 80
    const end = -Math.max(trackMetrics.viewportHeight, trackMetrics.height - trackMetrics.viewportHeight * 1.02)
    expect(trackMetrics.height / trackMetrics.viewportHeight).toBeLessThanOrEqual(7)

    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate(({ top, targetProgress, sticky, targetEnd }) => {
        window.scrollTo({ top: top - sticky + targetProgress * (sticky - targetEnd), behavior: 'instant' })
      }, { top: trackMetrics.top, targetProgress: progress, sticky: stickyTop, targetEnd: end })
      await page.waitForTimeout(100)

      const overlap = await cards.evaluateAll((elements) => {
        const front = elements
          .map((element) => ({
            opacity: Number.parseFloat(getComputedStyle(element).opacity),
            rect: element.getBoundingClientRect(),
          }))
          .sort((left, right) => right.opacity - left.opacity)
          .slice(0, 2)
        const [left, right] = front
        if (!left || !right) return { x: 0, y: 0 }
        return {
          x: Math.min(left.rect.right, right.rect.right) - Math.max(left.rect.left, right.rect.left),
          y: Math.min(left.rect.bottom, right.rect.bottom) - Math.max(left.rect.top, right.rect.top),
        }
      })

      expect(
        overlap.x <= 0 || overlap.y <= 0,
        `front cards overlap at ${viewport.width}px and progress ${progress}: ${Math.round(overlap.x)}px × ${Math.round(overlap.y)}px`,
      ).toBeTruthy()

      const rearOpacity = await cards.evaluateAll(elements => Math.min(
        ...elements.map(element => Number.parseFloat(getComputedStyle(element).opacity)),
      ))
      expect(rearOpacity).toBeLessThanOrEqual(0.01)

      const cardTransforms = await cards.evaluateAll(elements => (
        elements.map(element => (element as HTMLElement).style.transform)
      ))
      expect(cardTransforms.some(transform => /rotateY\((?!0deg)/.test(transform))).toBeTruthy()
      const wholeCardDeformationIsIsolated = await cards.evaluateAll(elements => elements.every((element) => {
        const image = element.querySelector<HTMLElement>('[data-helix-image]')
        const content = element.querySelector<HTMLElement>('[data-helix-content]')
        return Boolean(
          image && !image.style.transform && !image.style.filter
          && content && !content.style.transform
          && !element.querySelector('[data-helix-depth]')
          && !element.querySelector('[data-helix-sheen]')
          && !element.style.filter
          && element.style.transformOrigin === 'center center'
          && getComputedStyle(element).overflow === 'visible'
          && getComputedStyle(element).boxShadow !== 'none',
        )
      }))
      expect(wholeCardDeformationIsIsolated).toBeTruthy()

      const activeButton = navigation.locator('[aria-current="true"]')
      await expect(activeButton).toBeVisible()
      await expect.poll(async () => activeButton.evaluate((button) => {
        const navigationElement = button.closest('[data-project-navigation]')
        if (!navigationElement) return false
        const navigationRect = navigationElement.getBoundingClientRect()
        const buttonRect = button.getBoundingClientRect()
        return buttonRect.top >= navigationRect.top - 1 && buttonRect.bottom <= navigationRect.bottom + 1
      }), { timeout: 2_000 }).toBeTruthy()
    }
  }
})

test('desktop portfolio cards follow the active color mode', { tag: '@live-data' }, async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme, viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await page.goto('/#portfolio')

    const surface = page.locator('[data-helix-surface]').first()
    const title = surface.locator('h3')
    await expect(surface).toBeVisible()

    const colors = await surface.evaluate((element) => {
      const titleElement = element.querySelector('h3')
      return {
        background: getComputedStyle(element).backgroundColor,
        title: titleElement ? getComputedStyle(titleElement).color : '',
      }
    })

    if (colorScheme === 'light') {
      expect(colors.background).toMatch(/rgba?\((?:24[0-9]|25[0-5]),\s*(?:24[0-9]|25[0-5]),\s*(?:24[0-9]|25[0-5])/)
      expect(colors.title).toBe('rgb(3, 7, 18)')
    }
    else {
      expect(colors.background).toBe('rgb(17, 17, 27)')
      expect(colors.title).toBe('rgb(255, 255, 255)')
    }

    await expect(title).toBeVisible()
    await context.close()
  }
})

test('desktop service previews follow deliberate hover and stay still when idle', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openServiceSlideshow(page)
  const section = page.locator('#services')
  const cms = section.locator('[data-service-tab="cms"]')
  await cms.hover()
  await expect(cms).toHaveAttribute('aria-selected', 'true')
  await expect(section.getByRole('tabpanel')).toHaveAttribute('id', 'service-panel-cms')
  const preview = section.getByRole('tabpanel').locator('img').first()
  await expect(preview).toBeVisible()
  await expect.poll(() => preview.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.mouse.move(0, 0)
  await expect.poll(() => section.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.playState === 'running').length)).toBe(0)
  const firstRect = await preview.boundingBox()
  await page.waitForTimeout(600)
  await expect(cms).toHaveAttribute('aria-selected', 'true')
  expect(await preview.boundingBox()).toEqual(firstRect)
})

test('contact and footer share one continuous surface', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/#contact')

  const contact = page.locator('#contact')
  const footer = page.locator('[data-site-footer]')
  await expect(footer).toBeVisible()
  await expect(page.locator('[data-footer-transition]')).toBeAttached()

  const [contactBackground, footerBackground] = await Promise.all([
    contact.evaluate(element => getComputedStyle(element).backgroundColor),
    footer.evaluate(element => getComputedStyle(element).backgroundColor),
  ])
  expect(footerBackground).toBe(contactBackground)
})

test('health endpoint reports the application status', { tag: '@live-data' }, async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body.status).toBe('ok')
  expect(body.checks?.application).toBe('ok')
  expect(body.checks?.database).toBe('ok')
})

test('admin routes remain protected', { tag: '@live-data' }, async ({ page }) => {
  await page.goto('/admin/crm')
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible()
})

test('blog articles and links are available without JavaScript', { tag: '@live-data' }, async ({ browser, request }) => {
  const response = await request.get('/api/public/articles')
  expect(response.ok()).toBeTruthy()
  const articles = await response.json() as Array<{
    title: string
    slug: string
    excerpt: string
    published_at: string | null
    created_at: string
  }>

  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/blog')

  if (articles.length === 0) {
    await expect(page.getByText('Premiers articles bientôt disponibles...')).toBeVisible()
  }
  else {
    for (const article of articles) {
      const card = page.locator('article').filter({ hasText: article.title })
      await expect(card.getByRole('heading', { name: article.title })).toBeVisible()
      await expect(card.getByText(article.excerpt, { exact: true })).toBeVisible()
      await expect(card.locator('time')).toHaveAttribute('datetime', article.published_at || article.created_at)
      await expect(card.getByRole('link', { name: 'Lire' })).toHaveAttribute('href', `/blog/${encodeURIComponent(article.slug)}`)
    }

    const firstArticle = articles[0]!
    await page.locator(`a[href="/blog/${encodeURIComponent(firstArticle.slug)}"]`).click()
    await page.waitForLoadState('domcontentloaded')
    expect(new URL(page.url()).pathname).toBe(`/blog/${encodeURIComponent(firstArticle.slug)}`)
    await expect(page.getByRole('heading', { level: 1, name: firstArticle.title })).toBeVisible()
  }

  await context.close()
})

test('blog hydration keeps the server-rendered article list stable', { tag: '@live-data' }, async ({ page, request }) => {
  const hydrationMessages: string[] = []
  const pageErrors: string[] = []
  page.on('console', (message) => {
    if (/hydration/i.test(message.text())) hydrationMessages.push(message.text())
  })
  page.on('pageerror', error => pageErrors.push(error.message))

  const response = await request.get('/api/public/articles')
  expect(response.ok()).toBeTruthy()
  const articles = await response.json() as Array<{ title: string, slug: string }>
  const htmlResponse = await request.get('/blog')
  expect(htmlResponse.ok()).toBeTruthy()
  const initialHtml = await htmlResponse.text()
  expect(initialHtml.match(/<article\b/g) ?? []).toHaveLength(articles.length)
  for (const article of articles) {
    expect(initialHtml).toContain(`href="/blog/${encodeURIComponent(article.slug)}"`)
  }

  await page.goto('/blog')
  await expect(page.locator('article')).toHaveCount(articles.length)
  for (const article of articles) {
    await expect(page.locator(`a[href="/blog/${encodeURIComponent(article.slug)}"]`)).toBeVisible()
    await expect(page.getByRole('heading', { name: article.title })).toBeVisible()
  }
  expect(hydrationMessages).toEqual([])
  expect(pageErrors).toEqual([])
})

test('approved case studies stay complete and private-field free without JavaScript', { tag: '@live-data' }, async ({ browser, request }) => {
  const response = await request.get('/api/projects')
  expect(response.ok()).toBeTruthy()
  const projects = await response.json() as Array<Record<string, unknown>>
  const cases = projects.filter(project => project.case_study_published === true)
  const serialized = JSON.stringify(projects)
  for (const field of [
    'evidenceNote',
    'case_study_approved_by',
    'client_disclosure_status',
    'case_study_links_approved',
    'case_study_timeline_approved',
    'outcome_approved',
  ]) {
    expect(serialized).not.toContain(`"${field}"`)
  }

  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/cas-clients-valais')

  for (const project of cases) {
    const slug = String(project.slug)
    const path = `/projets/${encodeURIComponent(slug)}`
    await expect(page.locator(`a[href="${path}"]`).first()).toBeVisible()
    await page.goto(path)
    const markers = await page.locator('[data-case-study-section]').evaluateAll(elements => (
      elements.map(element => element.getAttribute('data-case-study-section'))
    ))
    expect(markers).toEqual(['context', 'role', 'scope', 'decisions', 'results'])
    await expect(page.locator('[data-case-study-services]')).toBeVisible()
    await page.goto('/cas-clients-valais')
  }

  await context.close()
})

test('every portfolio card links to a complete project page without JavaScript', { tag: '@live-data' }, async ({ browser, request }) => {
  const response = await request.get('/api/projects')
  expect(response.ok()).toBeTruthy()
  const projects = await response.json() as Array<Record<string, unknown>>
  const portfolio = projects.filter(project => project.portfolio_visible === true)

  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')

  for (const project of portfolio) {
    const slug = String(project.slug)
    const title = String(project.title)
    const path = `/projets/${encodeURIComponent(slug)}`
    expect(await page.locator(`a[href="${path}"]`).count()).toBeGreaterThan(0)
    const detailResponse = await page.goto(path)
    expect(detailResponse?.ok()).toBeTruthy()
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /À propos du projet/ })).toBeVisible()
    await page.goto('/')
  }

  await context.close()
})

test('service pages expose an accessible breadcrumb without JavaScript', async ({ browser }) => {
  const paths = [
    '/developpeur-web-valais',
    '/creation-site-internet-valais',
    '/refonte-site-web-valais',
    '/application-mobile-valais',
    '/audit-ia-pme',
  ]
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  for (const path of paths) {
    const response = await page.goto(path)
    expect(response?.ok()).toBeTruthy()
    const html = await response!.text()
    const breadcrumb = page.getByRole('navigation', { name: 'Fil d’Ariane' })
    await expect(breadcrumb).toBeVisible()
    await expect(breadcrumb.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/')
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(/Valais/)
    expect(html).toContain('BreadcrumbList')
    expect(html).toContain('Service')
  }

  await context.close()
})

test('service pages answer decision questions and expose proof and contact without JavaScript', async ({ browser }) => {
  const paths = [
    '/developpeur-web-valais',
    '/creation-site-internet-valais',
    '/refonte-site-web-valais',
    '/application-mobile-valais',
    '/audit-ia-pme',
  ]
  const expectedHeadings = [
    'Quels livrables sont inclus ?',
    'Comment se déroule le projet ?',
    'Quels délais prévoir ?',
    'Quelles sont les limites ?',
    'Quelle est la prochaine étape ?',
  ]
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  for (const path of paths) {
    const response = await page.goto(path)
    expect(response?.ok()).toBeTruthy()

    const introduction = page.locator('[data-service-introduction]')
    await expect(introduction).toBeVisible()
    await expect(introduction).toContainText('Valais')
    await expect(introduction).toHaveAttribute('data-service-offer', '')
    await expect(introduction).toHaveAttribute('data-service-audience', '')
    await expect(introduction).toHaveAttribute('data-service-area', '')

    const decisionContent = page.locator('[data-service-decision-content]')
    await expect(decisionContent).toBeVisible()
    const sectionHeadings = await decisionContent.locator('[data-service-section]').evaluateAll(sections => sections.map((section) => {
      return section.querySelector('h2')?.textContent?.trim()
    }))
    expect(sectionHeadings).toEqual(expectedHeadings)
    await expect(decisionContent.locator('[data-service-deliverable]').first()).toBeVisible()
    await expect(decisionContent.locator('[data-service-process-step]').first()).toBeVisible()
    await expect(decisionContent.locator('[data-service-timeline]')).toBeVisible()
    await expect(decisionContent.locator('[data-service-limit]').first()).toBeVisible()
    await expect(decisionContent.locator('[data-service-next-step]')).toBeVisible()
    await expect(decisionContent.locator('[data-service-proof-note]')).toBeVisible()
    await expect(decisionContent.locator('[data-service-proof-link]')).toHaveAttribute('href', '/#portfolio')
    await expect(decisionContent.locator('[data-service-contact-link]')).toHaveAttribute('href', '/#contact')
  }

  await context.close()
})
