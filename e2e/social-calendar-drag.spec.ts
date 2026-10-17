import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })

const now = '2026-10-19T08:00:00.000Z'
type Post = ReturnType<typeof makePost>
type PlanWrite = { method: string, path: string, body: Record<string, unknown> }

function makePost(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-0000-0000-${String(4100 + index).padStart(12, '0')}`,
    studioContentId: null,
    platform: 'x',
    article_title: `ANT41 brouillon ${index}`,
    article_url: 'https://www.antoinequarroz.ch/',
    content: 'Une idée ? Je la rends réelle. https://www.antoinequarroz.ch/',
    status: 'draft',
    version: 1,
    publication_mode: 'manual',
    approved_version: null,
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

function card(page: Page, post: Post, network = 'X'): Locator {
  return page.getByRole('button', { name: `Ouvrir ${post.article_title} sur ${network}`, exact: true }).filter({ visible: true })
}

function day(page: Page, date: string): Locator {
  return page.locator(`[data-calendar-day="${date}"]:visible`)
}

function unplanned(page: Page): Locator {
  return page.locator('[data-calendar-unplanned]:visible')
}

async function beginNativeDrag(page: Page, source: Locator, target: Locator, fromTitle = false) {
  // Resolve both scroll positions before pressing: Locator.dragTo() scrolls the
  // target after mousedown, which can move a near-bottom source out from under
  // the pointer before Chromium starts its drag. Real intermediate mouse moves
  // cross the native drag threshold; no successful drag is synthesized here.
  await source.scrollIntoViewIfNeeded()
  await target.scrollIntoViewIfNeeded()
  await expect(source).toBeInViewport()
  const sourceBox = await (fromTitle ? source.locator('p') : source).boundingBox()
  const targetBox = await target.boundingBox()
  expect(sourceBox).not.toBeNull()
  expect(targetBox).not.toBeNull()
  const origin = fromTitle
    ? { x: sourceBox!.x + sourceBox!.width / 2, y: sourceBox!.y + sourceBox!.height / 2 }
    : { x: sourceBox!.x + 8, y: sourceBox!.y + 8 }
  await page.mouse.move(origin.x, origin.y)
  await page.mouse.down()
  await page.mouse.move(origin.x + 12, origin.y + 8, { steps: 3 })
  await page.mouse.move(targetBox!.x + 25, targetBox!.y + 50, { steps: 12 })
  await page.mouse.move(targetBox!.x + 30, targetBox!.y + 55)
}

async function nativeDrag(page: Page, source: Locator, target: Locator, fromTitle = false) {
  try {
    await beginNativeDrag(page, source, target, fromTitle)
  }
  finally {
    await page.mouse.up()
  }
}

async function isolatedCalendar(page: Page, initialPosts: Post[], options: { holdPlan?: boolean, conflict?: boolean } = {}) {
  await page.clock.install({ time: new Date(now) })
  const posts = initialPosts.map(post => ({ ...post }))
  const writes: PlanWrite[] = []
  const unexpected: string[] = []
  let releasePlan: (() => void) | undefined
  const planGate = options.holdPlan ? new Promise<void>(resolve => { releasePlan = resolve }) : Promise.resolve()

  // All unknown mutations are blocked before the network. There is deliberately
  // no approval, publication, transport, or real-organization fixture here.
  await page.route('**/*', route => {
    const request = route.request()
    if (!['GET', 'HEAD'].includes(request.method())) {
      unexpected.push(`${request.method()} ${new URL(request.url()).pathname}`)
      return route.fulfill({ status: 403, json: { message: 'Write blocked by isolated ANT41 fixture' } })
    }
    return route.fallback()
  })
  // Limit this fixture to backend admin routes. Vite module paths can also
  // contain /api/ (for example @vue/devtools-api/lib/esm/api/index.js).
  await page.route('**/api/admin/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (request.method() === 'GET') {
      if (path === '/api/admin/organizations') return route.fulfill({ json: [{ id: 'ant41-test-org', name: 'ANT41 sandbox', slug: 'ant41', role: 'owner' }] })
      if (path === '/api/admin/social-insights') return route.fulfill({ json: { instagram: null, receivedAt: null } })
      if (path === '/api/admin/social-site-stats') return route.fulfill({ json: { available: false, configured: false, rows: [] } })
      if (path === '/api/admin/alerts') return route.fulfill({ json: [] })
      if (path === '/api/admin/marketing-analytics' || path === '/api/admin/posthog-stats') return route.fulfill({ status: 503, json: { message: 'Analytics unavailable in the isolated fixture' } })
      if (path === '/api/admin/social-posts') return route.fulfill({ json: {
        posts, connections: [],
        pagination: { page: 1, pageSize: 100, total: posts.length, totalPages: 1, hasMore: false },
      } })
    }

    const post = posts.find(item => path === `/api/admin/social-posts/${item.id}`)
    if (post && request.method() === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>
      writes.push({ method: request.method(), path, body })
      // An unexpected additional field would permit publication/content changes;
      // reject it even if the route otherwise resembles an editorial update.
      expect(Object.keys(body).sort()).toEqual(['action', 'planned_at', 'version'])
      expect(body.action).toBe('plan')
      expect(body.version).toBe(post.version)
      expect(body.planned_at === null || typeof body.planned_at === 'string').toBe(true)
      await planGate
      if (options.conflict) return route.fulfill({ status: 409, json: { message: 'Ce brouillon a été modifié. Rechargez le calendrier avant de réessayer.' } })
      Object.assign(post, { planned_at: body.planned_at, version: post.version + 1, updated_at: now })
      return route.fulfill({ json: post })
    }
    unexpected.push(`${request.method()} ${path}`)
    return route.fulfill({ status: 403, json: { message: 'Unexpected API request blocked by ANT41 fixture' } })
  })

  const timestamp = Math.floor(Date.parse(now) / 1000)
  const user = { id: '00000000-0000-0000-0000-000000000041', email: 'ant41@example.invalid', aud: 'authenticated', role: 'authenticated', factors: [], app_metadata: {}, user_metadata: {}, identities: [], created_at: now }
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
    return route.fulfill({ status: 403, json: { message: 'Unexpected auth request blocked by ANT41 fixture' } })
  })

  await page.goto('/admin/login?redirect=/admin/social')
  await expect(page.getByLabel(/email/i)).toBeEnabled()
  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/mot de passe/i).fill('synthetic-browser-only-password')
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(url => url.pathname.replace(/\/$/, '') === '/admin/social')
  await expect(page.getByRole('region', { name: 'Calendrier éditorial', exact: true })).toBeVisible()
  await expect(card(page, posts[0]!)).toBeVisible()
  await page.evaluate(() => {
    const targetWindow = window as typeof window & { ant41NativeEvents?: { type: string, trusted: boolean }[] }
    targetWindow.ant41NativeEvents = []
    for (const type of ['dragstart', 'drop', 'dragend']) document.addEventListener(type, event => {
      targetWindow.ant41NativeEvents!.push({ type, trusted: event.isTrusted })
    }, true)
  })
  return { posts, writes, unexpected, releasePlan: () => releasePlan?.(), nativeEvents: () => page.evaluate(() => (window as typeof window & { ant41NativeEvents?: { type: string, trusted: boolean }[] }).ant41NativeEvents || []) }
}

test('native calendar drag plans a draft, ignores the same day, and can return it to unplanned without approval', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const post = makePost(0)
  const state = await isolatedCalendar(page, [post])
  await expect(card(page, post)).toHaveAttribute('draggable', 'true')
  await nativeDrag(page, card(page, post), day(page, '2026-10-22'))
  await expect.poll(() => state.writes.length).toBe(1)
  expect(state.writes[0]).toEqual({ method: 'PUT', path: `/api/admin/social-posts/${post.id}`, body: { action: 'plan', version: 1, planned_at: '2026-10-22T16:00:00.000Z' } })
  await expect(day(page, '2026-10-22').getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })).toBeVisible()
  expect(state.posts[0]).toMatchObject({ status: 'draft', publication_mode: 'manual', approved_version: null, publish_after: null, version: 2 })
  expect(await state.nativeEvents()).toEqual([{ type: 'dragstart', trusted: true }, { type: 'drop', trusted: true }, { type: 'dragend', trusted: true }])
  await page.getByRole('region', { name: 'Calendrier éditorial', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/tmp/ant41-calendar-drop.png' })

  await nativeDrag(page, card(page, post), day(page, '2026-10-22'), true)
  await expect(card(page, post)).toHaveAttribute('draggable', 'true')
  expect(state.writes).toHaveLength(1)
  await nativeDrag(page, card(page, post), unplanned(page))
  await expect.poll(() => state.writes.length).toBe(2)
  expect(state.writes[1]!.body).toEqual({ action: 'plan', version: 2, planned_at: null })
  await expect(unplanned(page).getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })).toBeVisible()
  expect(state.posts[0]).toMatchObject({ status: 'draft', publication_mode: 'manual', approved_version: null, publish_after: null, planned_at: null })
  await page.reload()
  await expect(unplanned(page).getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(2)
  expect(state.unexpected).toEqual([])
})

test('a dragged draft keeps its Zurich time and captured version, moving only after persistence succeeds', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const post = makePost(1, { version: 7, planned_at: '2026-10-20T08:45:00.000Z' })
  const state = await isolatedCalendar(page, [post], { holdPlan: true })
  try {
    await nativeDrag(page, card(page, post), day(page, '2026-10-25'), true)
    await expect.poll(() => state.writes.length).toBe(1)
    // Switzerland switches to winter time on the destination day. 10:45 stays
    // 10:45 locally, which is 09:45 UTC rather than the source's 08:45 UTC.
    expect(state.writes[0]!.body).toEqual({ action: 'plan', version: 7, planned_at: '2026-10-25T09:45:00.000Z' })
    await expect(day(page, '2026-10-20').getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })).toBeVisible()
    await expect(day(page, '2026-10-25').getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })).toHaveCount(0)
    await expect(card(page, post)).toHaveAttribute('draggable', 'false')
    await expect(page.getByRole('button', { name: 'Actualiser', exact: true })).toBeDisabled()
    expect(state.posts[0]).toMatchObject({ planned_at: post.planned_at, version: 7 })
  }
  finally {
    state.releasePlan()
  }
  await expect(day(page, '2026-10-25').getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })).toBeVisible()
  await expect(card(page, post)).toHaveAttribute('draggable', 'true')
  expect(state.posts[0]).toMatchObject({ status: 'draft', publication_mode: 'manual', approved_version: null, publish_after: null, version: 8 })
  expect(state.writes).toHaveLength(1)
  expect(state.unexpected).toEqual([])
})

test('a concurrent edit is explicit and leaves the draft on its original day without retrying or approving', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const post = makePost(2, { planned_at: '2026-10-20T16:00:00.000Z' })
  const state = await isolatedCalendar(page, [post], { conflict: true })
  await nativeDrag(page, card(page, post), day(page, '2026-10-23'))
  await expect(page.getByRole('alert').filter({ hasText: 'Actualise le calendrier' })).toBeVisible()
  await expect(day(page, '2026-10-20').getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })).toBeVisible()
  await expect(day(page, '2026-10-23').getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })).toHaveCount(0)
  await expect(card(page, post)).toHaveAttribute('draggable', 'true')
  expect(state.posts[0]).toMatchObject({ planned_at: post.planned_at, version: 1, status: 'draft' })
  expect(state.writes).toHaveLength(1)
  expect(state.unexpected).toEqual([])
})

test('external and cancelled drag gestures cannot modify an editorial date', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const post = makePost(3)
  const state = await isolatedCalendar(page, [post])
  const external = await page.evaluateHandle((id) => {
    const transfer = new DataTransfer()
    transfer.setData('text/plain', id)
    transfer.setData('application/x-antoine-social-post', id)
    return transfer
  }, post.id)
  await day(page, '2026-10-22').dispatchEvent('dragover', { dataTransfer: external })
  await day(page, '2026-10-22').dispatchEvent('drop', { dataTransfer: external })
  expect(state.writes).toEqual([])
  await beginNativeDrag(page, card(page, post), day(page, '2026-10-22'), true)
  await expect(page.getByRole('status').filter({ hasText: 'Dépose le brouillon' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(page.getByRole('status').filter({ hasText: 'Déplacement annulé' })).toBeVisible()
  await expect(unplanned(page).getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })).toBeVisible()
  await expect(card(page, post)).toHaveAttribute('draggable', 'true')
  expect(state.writes).toEqual([])
  expect(state.posts[0]).toMatchObject({ planned_at: null, version: 1, status: 'draft' })
  expect(state.unexpected).toEqual([])
})

test('the mobile keyboard alternative moves and unplans failed drafts, while authorized and final posts remain protected', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const post = makePost(4, { status: 'failed', planned_at: '2026-10-20T16:25:00.000Z', last_error: 'Ancien essai refusé, à relire.' })
  const protectedPosts = ['approved', 'publishing', 'published', 'rejected'].map((status, index) => makePost(10 + index, {
    status, planned_at: '2026-10-21T16:00:00.000Z',
    ...(status === 'approved' ? { publication_mode: 'automatic', approved_version: 1, publish_after: '2026-10-21T16:00:00.000Z' } : {}),
    ...(status === 'published' ? { published_at: '2026-10-21T16:00:00.000Z' } : {}),
  }))
  const state = await isolatedCalendar(page, [post, ...protectedPosts])
  const moveButton = page.getByRole('button', { name: `Déplacer ${post.article_title} sur X`, exact: true }).filter({ visible: true })
  const dialog = page.getByRole('dialog', { name: 'Déplacer le brouillon', exact: true })
  await moveButton.focus()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('18:25')
  await dialog.getByLabel('Nouvelle date souhaitée', { exact: true }).fill('2026-10-23')
  await page.screenshot({ path: '/tmp/ant41-move-mobile.png' })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toEqual([])

  await moveButton.focus()
  await page.keyboard.press('Enter')
  await dialog.getByLabel('Nouvelle date souhaitée', { exact: true }).fill('2026-10-23')
  await dialog.getByRole('button', { name: 'Déplacer le brouillon', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(day(page, '2026-10-23').getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })).toBeVisible()
  expect(state.writes[0]!.body).toEqual({ action: 'plan', version: 1, planned_at: '2026-10-23T16:25:00.000Z' })
  expect(state.posts[0]).toMatchObject({ status: 'failed', publication_mode: 'manual', approved_version: null, publish_after: null, content: post.content })
  await moveButton.click()
  await dialog.getByRole('button', { name: 'Retirer du calendrier', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(unplanned(page).getByRole('button', { name: `Ouvrir ${post.article_title} sur X`, exact: true })).toBeVisible()
  expect(state.writes[1]!.body).toEqual({ action: 'plan', version: 2, planned_at: null })

  for (const protectedPost of protectedPosts) {
    await expect(card(page, protectedPost)).not.toHaveAttribute('draggable', 'true')
    await expect(page.getByRole('button', { name: `Déplacer ${protectedPost.article_title} sur X`, exact: true })).toHaveCount(0)
  }
  expect(state.writes).toHaveLength(2)
  expect(state.unexpected).toEqual([])
})
