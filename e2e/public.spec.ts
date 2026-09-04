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

test('blog articles and links are available without JavaScript', async ({ browser, request }) => {
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

test('blog hydration keeps the server-rendered article list stable', async ({ page, request }) => {
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

test('approved case studies stay complete and private-field free without JavaScript', async ({ browser, request }) => {
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
