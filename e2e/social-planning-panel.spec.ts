import { expect, test, type Locator, type Page } from '@playwright/test'

// These browser-only fixtures contain no real accounts, tokens, posts or media.
// Every unknown write is blocked; publishing and approval routes are never mocked.
test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test.setTimeout(90_000)

const now = '2026-10-19T08:00:00.000Z'
type Post = ReturnType<typeof makePost>
type Write = { method: string, path: string, body: Record<string, unknown> }

function makePost(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-0000-0000-${String(4400 + index).padStart(12, '0')}`,
    studioContentId: null,
    platform: 'x',
    article_title: `ANT44 brouillon ${String(index + 1).padStart(2, '0')}`,
    article_url: 'https://www.antoinequarroz.ch/',
    content: 'Une idée ? Je la rends réelle. https://www.antoinequarroz.ch/',
    status: 'draft',
    version: 1,
    publication_mode: 'manual',
    approved_version: null,
    approval_fingerprint: null,
    media_kind: null,
    media_url: null,
    media_title: null,
    media_images: [],
    media_items: [],
    planned_at: null as string | null,
    publish_after: null as string | null,
    published_at: null,
    external_post_url: null,
    last_error: null,
    created_at: new Date(Date.parse(now) - index * 60_000).toISOString(),
    updated_at: now,
    ...overrides,
  }
}

function panel(page: Page): Locator { return page.locator('[data-calendar-unplanned]:visible') }
function planningList(page: Page): Locator { return panel(page).locator('[data-planning-list]') }
async function expectActiveCount(page: Page, count: number) {
  await expect(panel(page).getByRole('heading', { name: 'À planifier', exact: true })).toBeVisible()
  await expect(panel(page).locator('header [aria-live="polite"]')).toHaveText(String(count))
}
function openCard(page: Page, post: Post): Locator {
  return page.getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true }).filter({ visible: true })
}
function action(page: Page, post: Post, name: 'Déplacer' | 'Supprimer' | 'Restaurer'): Locator {
  return page.getByRole('button', { name: `${name} ${post.article_title} sur X`, exact: true }).filter({ visible: true })
}
function sampleBacklog() {
  return [
    ...Array.from({ length: 44 }, (_, index) => makePost(index)),
    ...Array.from({ length: 42 }, (_, index) => makePost(100 + index, {
      status: 'rejected',
      article_title: `ANT44 refusé ${index + 1}`,
      // The explicit rejected view must recover dated history too.
      planned_at: index === 0 ? '2026-09-01T16:00:00.000Z' : null,
    })),
  ]
}

async function isolatedPlanning(page: Page, initialPosts: Post[], options: { conflictOnReject?: boolean } = {}) {
  await page.clock.install({ time: new Date(now) })
  const posts = initialPosts.map(post => ({ ...post }))
  const writes: Write[] = []
  const unexpected: string[] = []

  await page.route('**/*', route => {
    const request = route.request()
    if (!['GET', 'HEAD'].includes(request.method())) {
      unexpected.push(`${request.method()} ${new URL(request.url()).pathname}`)
      return route.fulfill({ status: 403, json: { message: 'Write blocked by isolated ANT44 fixture' } })
    }
    return route.fallback()
  })
  await page.route('**/api/admin/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === 'GET') {
      if (path === '/api/admin/organizations') return route.fulfill({ json: [{ id: 'ant44-sandbox-org', name: 'ANT44 sandbox', slug: 'ant44', role: 'owner' }] })
      if (path === '/api/admin/social-insights') return route.fulfill({ json: { instagram: null, receivedAt: null } })
      if (path === '/api/admin/social-site-stats') return route.fulfill({ json: { available: false, configured: false, rows: [] } })
      if (path === '/api/admin/alerts') return route.fulfill({ json: [] })
      if (path === '/api/admin/social-posts') return route.fulfill({ json: {
        posts, connections: [],
        pagination: { page: 1, pageSize: 100, total: posts.length, totalPages: 1, hasMore: false },
      } })
      if (path === '/api/admin/marketing-analytics' || path === '/api/admin/posthog-stats') return route.fulfill({ status: 503, json: { message: 'Analytics unavailable in the isolated fixture' } })
    }
    const post = posts.find(item => path === `/api/admin/social-posts/${item.id}`)
    if (post && request.method() === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>
      writes.push({ method: request.method(), path, body })
      expect(body.version).toBe(post.version)
      expect(['reject', 'restore', 'plan']).toContain(body.action)
      // No content edit, validation, scheduling or publishing field can pass here.
      expect(Object.keys(body).sort()).toEqual(body.action === 'plan' ? ['action', 'planned_at', 'version'] : ['action', 'version'])
      if (options.conflictOnReject && body.action === 'reject') return route.fulfill({ status: 409, json: { message: 'Ce brouillon a été modifié. Actualise le calendrier avant de réessayer.' } })
      if (body.action === 'plan') {
        expect(body.planned_at === null || typeof body.planned_at === 'string').toBe(true)
        Object.assign(post, { planned_at: body.planned_at })
      }
      else if (body.action === 'reject') Object.assign(post, { status: 'rejected', publish_after: null })
      else Object.assign(post, { status: 'draft', publication_mode: 'manual', approved_version: null, approval_fingerprint: null, publish_after: null })
      Object.assign(post, { version: post.version + 1, updated_at: now })
      return route.fulfill({ json: post })
    }
    unexpected.push(`${request.method()} ${path}`)
    return route.fulfill({ status: 403, json: { message: 'Unexpected API request blocked by ANT44 fixture' } })
  })

  const timestamp = Math.floor(Date.parse(now) / 1000)
  const user = { id: '00000000-0000-0000-0000-000000000044', email: 'ant44@example.invalid', aud: 'authenticated', role: 'authenticated', factors: [], app_metadata: {}, user_metadata: {}, identities: [], created_at: now }
  const accessToken = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', aal: 'aal2', exp: timestamp + 3600, iat: timestamp })).toString('base64url'),
    Buffer.from('synthetic-browser-only-signature').toString('base64url'),
  ].join('.')
  const session = { access_token: accessToken, refresh_token: 'synthetic-browser-only-refresh', expires_at: timestamp + 3600, expires_in: 3600, token_type: 'bearer', user }
  await page.route('**/auth/v1/**', route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/token') && url.searchParams.get('grant_type') === 'password') {
      expect(request.postDataJSON()).toMatchObject({ email: user.email, password: 'synthetic-browser-only-password' })
      return route.fulfill({ json: session })
    }
    if (url.pathname.endsWith('/user') && request.method() === 'GET') return route.fulfill({ json: user })
    unexpected.push(`${request.method()} ${url.pathname}`)
    return route.fulfill({ status: 403, json: { message: 'Unexpected auth request blocked by ANT44 fixture' } })
  })

  await page.goto('/admin/login?redirect=/admin/social')
  await expect(page.getByLabel(/email/i)).toBeEnabled()
  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/mot de passe/i).fill('synthetic-browser-only-password')
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(url => url.pathname.replace(/\/$/, '') === '/admin/social')
  await expect(panel(page)).toBeVisible()
  await expect(openCard(page, posts[0]!)).toBeVisible()
  return { posts, writes, unexpected }
}

async function assertContainedBacklog(page: Page) {
  const geometry = await planningList(page).evaluate(element => {
    const rect = element.getBoundingClientRect()
    return { height: rect.height, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, overflow: getComputedStyle(element).overflowY, pageHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight, pageWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }
  })
  expect(geometry.height).toBeGreaterThan(100)
  expect(geometry.height).toBeLessThanOrEqual(geometry.viewportHeight)
  expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight + 500)
  expect(['auto', 'scroll']).toContain(geometry.overflow)
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewportWidth)
  // Forty-four cards must not create the original multi-screen blank document.
  expect(geometry.pageHeight).toBeLessThan(geometry.viewportHeight * 3.5)
}

function expectUnapproved(post: Post) {
  expect(post).toMatchObject({ status: 'draft', publication_mode: 'manual', approved_version: null, approval_fingerprint: null, publish_after: null, published_at: null })
}

test('44 active drafts stay in a bounded planning panel, keeping rejected history separate', async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 })
  const state = await isolatedPlanning(page, sampleBacklog())
  await expectActiveCount(page, 44)
  await expect(planningList(page).locator('[data-social-post-id]')).toHaveCount(44)
  await expect(planningList(page).getByRole('button', { name: /^Ouvrir ANT44 refusé/ })).toHaveCount(0)
  await assertContainedBacklog(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await assertContainedBacklog(page)
  await page.setViewportSize({ width: 1700, height: 1000 })
  const initialHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  const last = state.posts[43]!
  await action(page, last, 'Déplacer').scrollIntoViewIfNeeded()
  await expect(action(page, last, 'Déplacer')).toBeInViewport()
  await expect.poll(() => planningList(page).evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(initialHeight)
  await action(page, last, 'Déplacer').click()
  await expect(page.getByRole('dialog', { name: 'Déplacer le brouillon', exact: true })).toContainText(last.article_title)
  await expect(page.getByRole('dialog', { name: 'Publication X', exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Voir les refusés (42)', exact: true }).click()
  await expect(page.getByLabel('Filtrer par statut', { exact: true })).toHaveValue('rejected')
  await expect(planningList(page).locator('[data-social-post-id]')).toHaveCount(42)
  // This item carries a date outside the visible week: it remains recoverable.
  await expect(planningList(page).getByRole('button', { name: 'Ouvrir ANT44 refusé 1 sur X', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Revenir aux brouillons', exact: true }).click()
  await expect(planningList(page).locator('[data-social-post-id]')).toHaveCount(44)
  expect(state.writes).toEqual([])
  expect(state.unexpected).toEqual([])
  await panel(page).scrollIntoViewIfNeeded()
  await page.screenshot({ path: '.artifacts/ant44/planning-desktop-1700.png' })
})

test('direct removal is cancellable, keeps content recoverable in rejected history, and restores without approval', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const state = await isolatedPlanning(page, sampleBacklog())
  const post = state.posts[0]!
  const content = post.content
  const removal = page.getByRole('dialog', { name: 'Supprimer ce brouillon ?', exact: true })
  await action(page, post, 'Supprimer').click()
  await expect(removal).toBeVisible()
  await expect(removal).toContainText(/refusés/i)
  await expect(removal).toContainText(post.article_title)
  await expect(page.getByRole('dialog', { name: 'Publication X', exact: true })).toHaveCount(0)
  expect(state.writes).toEqual([])
  await removal.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(removal).toHaveCount(0)
  await expect(openCard(page, post)).toBeVisible()
  expect(state.writes).toEqual([])

  await action(page, post, 'Supprimer').click()
  await removal.getByRole('button', { name: 'Supprimer le brouillon', exact: true }).click()
  await expect(removal).toHaveCount(0)
  expect(state.writes).toEqual([{ method: 'PUT', path: `/api/admin/social-posts/${post.id}`, body: { action: 'reject', version: 1 } }])
  await expect(openCard(page, post)).toHaveCount(0)
  await expectActiveCount(page, 43)
  expect(post).toMatchObject({ status: 'rejected', content, version: 2, published_at: null })
  await page.getByRole('button', { name: 'Voir les refusés (43)', exact: true }).click()
  await expect(openCard(page, post)).toBeVisible()
  await action(page, post, 'Restaurer').click()
  await expect(openCard(page, post)).toHaveCount(0)
  expect(state.writes).toHaveLength(2)
  expect(state.writes[1]).toEqual({ method: 'PUT', path: `/api/admin/social-posts/${post.id}`, body: { action: 'restore', version: 2 } })
  await page.getByRole('button', { name: 'Revenir aux brouillons', exact: true }).click()
  await expectActiveCount(page, 44)
  await expect(openCard(page, post)).toBeVisible()
  expectUnapproved(post)
  expect(post.content).toBe(content)
  expect(state.unexpected).toEqual([])
})

test('a concurrent removal leaves the draft in place and reports the conflict without retrying', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const post = makePost(0)
  const state = await isolatedPlanning(page, [post], { conflictOnReject: true })
  await action(page, post, 'Supprimer').click()
  const removal = page.getByRole('dialog', { name: 'Supprimer ce brouillon ?', exact: true })
  await removal.getByRole('button', { name: 'Supprimer le brouillon', exact: true }).click()
  await expect(removal.getByRole('alert')).toContainText(/modifié|changé/i)
  await expect(removal.getByRole('button', { name: 'Annuler', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(removal).toHaveCount(0)
  await expect(openCard(page, post)).toHaveCount(1)
  await expectActiveCount(page, 1)
  expectUnapproved(state.posts[0]!)
  expect(state.posts[0]!.version).toBe(1)
  expect(state.writes).toHaveLength(1)
  expect(state.unexpected).toEqual([])
})

test('375px keyboard planning keeps direct actions reachable, scroll contained and publication manual', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const state = await isolatedPlanning(page, sampleBacklog())
  await assertContainedBacklog(page)
  const post = state.posts[43]!
  const move = action(page, post, 'Déplacer')
  await move.focus()
  await expect(move).toBeInViewport()
  const buttonBox = await move.boundingBox()
  expect(buttonBox!.height).toBeGreaterThanOrEqual(44)
  await page.keyboard.press('Enter')
  const moveDialog = page.getByRole('dialog', { name: 'Déplacer le brouillon', exact: true })
  await expect(moveDialog).toBeVisible()
  await moveDialog.getByLabel('Nouvelle date souhaitée', { exact: true }).fill('2026-10-22')
  await moveDialog.getByRole('button', { name: 'Déplacer le brouillon', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(moveDialog).toHaveCount(0)
  expect(state.writes).toEqual([{ method: 'PUT', path: `/api/admin/social-posts/${post.id}`, body: { action: 'plan', version: 1, planned_at: '2026-10-22T16:00:00.000Z' } }])
  const movedCard = page.locator('[data-calendar-day="2026-10-22"]:visible').getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })
  await expect(movedCard).toBeVisible()
  // Wait for the move dialog's asynchronous focus handoff before beginning
  // another keyboard action in the nested planning list.
  await expect(movedCard).toBeFocused()
  expectUnapproved(post)

  // A second draft can be removed with the keyboard, independently of its card.
  const second = state.posts[42]!
  const removeSecond = action(page, second, 'Supprimer')
  await removeSecond.focus()
  await page.keyboard.press('Enter')
  const removal = page.getByRole('dialog', { name: 'Supprimer ce brouillon ?', exact: true })
  await expect(removal).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(removal).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  expectUnapproved(second)
  await expect(removeSecond).toBeFocused()
  await expect(removeSecond).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(state.unexpected).toEqual([])
  await panel(page).scrollIntoViewIfNeeded()
  await page.screenshot({ path: '.artifacts/ant44/planning-mobile-375.png' })
})
