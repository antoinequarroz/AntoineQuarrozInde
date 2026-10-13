import { expect, test, type Page } from '@playwright/test'
import { navigateToFixtureHomepage } from './helpers/fixtureHomepage'

const summaries = Array.from({ length: 3 }, (_, index) => ({
  title: `Homepage article ${index + 1}`,
  slug: `homepage-article-${index + 1}`,
  excerpt: `Summary for homepage article ${index + 1}.`,
  cover_image: null,
  published_at: '2026-10-13T04:30:00Z',
  tags: ['Web'],
  created_at: '2026-10-13T04:30:00Z',
  read_time: 3,
}))

async function openArticleFixtures(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/marketing-event', route => route.fulfill({ json: { ok: true } }))
  await page.route('**/api/public/articles?*', route => {
    expect(new URL(route.request().url()).searchParams.get('limit')).toBe('3')
    return route.fulfill({ json: summaries })
  })
  const response = await navigateToFixtureHomepage(page, '/api/public/articles')
  expect(await response.json()).toEqual(summaries)
  await expect(page.locator('#blog article')).toHaveCount(3)
  await page.locator('#blog').scrollIntoViewIfNeeded()
}

test('mobile home serializes only article summaries and keeps account and calendar scripts deferred', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/marketing-event', route => route.fulfill({ json: { ok: true } }))
  const requests: string[] = []
  const sdkChecks: Promise<boolean>[] = []
  page.on('request', request => requests.push(request.url()))
  page.on('response', response => {
    const pathname = new URL(response.url()).pathname
    // Prefetch responses may be typed as "other" rather than "script". They
    // still cost mobile bandwidth even when their code is not executed.
    if (pathname.startsWith('/_nuxt/') && pathname.endsWith('.js')) {
      sdkChecks.push(response.text().then(source => /supabase-js|GoTrueClient|PostgrestClient/.test(source)))
    }
  })

  const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  const html = await response!.text()
  expect(Buffer.byteLength(html)).toBeLessThan(450_000)
  const rawPayload = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1]
  expect(rawPayload).toBeTruthy()
  const payload: unknown[] = JSON.parse(rawPayload!)
  const articles = payload.filter((item): item is Record<string, unknown> => item !== null
    && typeof item === 'object' && !Array.isArray(item)
    && 'title' in item && 'slug' in item && 'excerpt' in item)
  expect(articles.length).toBeLessThanOrEqual(3)
  expect(articles.some(article => 'content' in article)).toBe(false)
  await expect(page.locator('#mobile-menu-trigger')).toBeEnabled()
  await expect(page.locator('#contact a[data-cal-link]')).toHaveCount(1)
  const scriptHints = await page.locator('link[rel="prefetch"][as="script"]').evaluateAll(links =>
    links.map(link => (link as HTMLLinkElement).href).filter(href => new URL(href).pathname.startsWith('/_nuxt/')))
  for (const href of scriptHints) {
    const hintedScript = await request.get(href)
    expect(hintedScript.ok()).toBe(true)
    expect(await hintedScript.text()).not.toMatch(/supabase-js|GoTrueClient|PostgrestClient/)
  }
  await page.waitForTimeout(600)
  expect((await Promise.all(sdkChecks)).some(Boolean)).toBe(false)
  expect(requests.some(url => url.includes('/embed/embed.js'))).toBe(false)
  expect(requests.some(url => new URL(url).pathname === '/api/articles')).toBe(false)
})

test('home article preview fetches one body on demand, closes accessibly and links to the full article', async ({ page }) => {
  const bodyRequests: string[] = []
  await page.route('**/api/public/articles/homepage-article-*', route => {
    const slug = new URL(route.request().url()).pathname.split('/').pop()!
    bodyRequests.push(slug)
    const summary = summaries.find(article => article.slug === slug)!
    return route.fulfill({ json: { slug, title: summary.title, excerpt: summary.excerpt, content: `BODY_ONLY_ON_DEMAND_${slug}` } })
  })
  await openArticleFixtures(page)
  expect(bodyRequests).toEqual([])
  const previewButton = page.locator('#blog').getByRole('button', { name: 'Aperçu rapide', exact: true })
  await previewButton.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('BODY_ONLY_ON_DEMAND_homepage-article-1')
  expect(bodyRequests).toEqual(['homepage-article-1'])
  await expect(dialog.locator('a')).toHaveAttribute('href', '/blog/homepage-article-1')
  await expect(dialog.getByRole('button', { name: 'Fermer' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(previewButton).toBeFocused()
  await page.locator('#blog').getByRole('link', { name: 'Tous les articles', exact: true }).click()
  await expect(page).toHaveURL(/\/blog$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Articles.')
})

test('a failed article preview retains a usable full-article link and can be retried', async ({ page }) => {
  let unavailable = true
  await page.route('**/api/public/articles/homepage-article-1', route => unavailable
    ? route.fulfill({ status: 503, json: { message: 'Unavailable' } })
    : route.fulfill({ json: { slug: summaries[0]!.slug, title: summaries[0]!.title, excerpt: summaries[0]!.excerpt, content: 'PREVIEW_RECOVERED' } }))
  await openArticleFixtures(page)
  const previewButton = page.locator('#blog').getByRole('button', { name: 'Aperçu rapide', exact: true })
  await previewButton.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('status')).toContainText('L’aperçu est temporairement indisponible')
  await expect(dialog.locator('a')).toHaveAttribute('href', '/blog/homepage-article-1')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  unavailable = false
  await previewButton.click()
  await expect(dialog).toContainText('PREVIEW_RECOVERED')
})
