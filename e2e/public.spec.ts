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
