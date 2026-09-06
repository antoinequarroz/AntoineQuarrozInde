import { expect, test } from '@playwright/test'

test('landing page exposes the main conversion paths', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Antoine Quarroz/i)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /contact|parler|projet/i }).first()).toBeVisible()
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

  const reducedContext = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
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
  await expect(mobilePage.locator('[data-spline-state="fallback-mobile"]')).toBeVisible()
  await expect(mobilePage.locator('img[src="/hero-robot-mobile.png"]')).toBeVisible()
  const splineRuntimeLoaded = await mobilePage.evaluate(() => performance
    .getEntriesByType('resource')
    .some(entry => entry.name.includes('@splinetool/viewer')))
  expect(splineRuntimeLoaded).toBeFalsy()
  await mobileContext.close()
})

test('mobile landing keeps every visible interactive target touch friendly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

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
})

test('analytics failure never blocks the primary contact path', async ({ page }) => {
  await page.route('**/api/marketing-event', route => route.abort())
  await page.goto('/')
  await page.locator('[data-hero-primary-cta]').click()
  await expect(page).toHaveURL(/#contact$/)
  await expect(page.locator('#contact-form')).toBeVisible()
})

test('mobile portfolio makes horizontal browsing and project actions explicit', { tag: '@live-data' }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#portfolio')

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

test('service cards settle without competing transform animations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#services')

  const cards = page.locator('[data-service-card]')
  await expect(cards).toHaveCount(3)
  await expect(cards.first()).toBeVisible()
  await page.waitForTimeout(700)

  const firstSample = await cards.evaluateAll(elements => elements.map((element) => ({
    animationName: getComputedStyle(element).animationName,
    transform: getComputedStyle(element).transform,
  })))
  await page.waitForTimeout(350)
  const secondSample = await cards.evaluateAll(elements => elements.map(element => getComputedStyle(element).transform))

  expect(firstSample.every(sample => sample.animationName === 'none')).toBeTruthy()
  expect(firstSample.map(sample => sample.transform)).toEqual(secondSample)
  expect(firstSample[0]?.transform).not.toBe('none')
  expect(firstSample[2]?.transform).not.toBe('none')
  expect(firstSample[0]?.transform).not.toBe(firstSample[2]?.transform)
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

test('service pages expose an accessible breadcrumb without JavaScript', async ({ browser }) => {
  const paths = [
    '/developpeur-web-valais',
    '/creation-site-internet-valais',
    '/refonte-site-web-valais',
    '/application-mobile-valais',
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
