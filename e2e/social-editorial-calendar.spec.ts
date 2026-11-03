import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { waitForAdminLoginReady } from './helpers/admin-login-ready'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })

const now = '2026-10-19T08:00:00.000Z'
const mediaRoot = 'https://www.antoinequarroz.ch/social/ant39/'
const image = readFileSync(resolve(process.cwd(), 'public/social/physiobaur/01-PhysioBaur.jpg'))
type Post = ReturnType<typeof makePost>
type Write = { method: string, path: string, body: Record<string, any> }

function makePost(index: number, overrides: Record<string, any> = {}) {
  return {
    id: `00000000-0000-0000-0000-${String(3900 + index).padStart(12, '0')}`,
    studioContentId: null,
    platform: 'x',
    article_title: `ANT39 publication ${index}`,
    article_url: 'https://www.antoinequarroz.ch/',
    content: 'Une réalisation à découvrir : https://www.antoinequarroz.ch/',
    status: 'draft',
    version: 1,
    publication_mode: 'manual',
    approved_version: null,
    media_kind: null,
    media_url: null,
    media_title: null,
    media_images: [] as { url: string, alt: string }[],
    media_items: [] as { type: 'image' | 'video', url: string, alt: string }[],
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

async function openCalendar(page: Page, initialPosts: Post[], options: { failSecondPage?: boolean } = {}) {
  await page.clock.install({ time: new Date(now) })
  const posts = initialPosts.map(post => ({ ...post }))
  const writes: Write[] = []
  const reads: number[] = []
  const unexpected: string[] = []
  let failSecondPage = Boolean(options.failSecondPage)

  // Unknown writes, including any publishing transport, are stopped before
  // the browser can reach a server. Only the explicit fixture operations below
  // receive simulated responses; no real organization or post is modified.
  await page.route('**/*', route => {
    const request = route.request()
    if (!['GET', 'HEAD'].includes(request.method())) {
      unexpected.push(`${request.method()} ${new URL(request.url()).pathname}`)
      return route.fulfill({ status: 403, json: { message: 'External write blocked by ANT39 fixture' } })
    }
    return route.fallback()
  })
  await page.route(`${mediaRoot}**`, route => route.fulfill({
    contentType: 'image/jpeg', body: image,
  }))
  await page.route('**/api/admin/**', route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (request.method() !== 'GET') writes.push({ method: request.method(), path, body: request.postDataJSON() })
    if (path === '/api/admin/organizations') return route.fulfill({ json: [{ id: 'ant39-test-org', name: 'ANT39 sandbox', slug: 'ant39', role: 'owner' }] })
    if (path === '/api/admin/social-insights') return route.fulfill({ json: { instagram: null, receivedAt: null } })
    if (path === '/api/admin/social-site-stats') return route.fulfill({ json: { available: false, configured: false, rows: [] } })
    if (path === '/api/admin/marketing-analytics' || path === '/api/admin/posthog-stats') return route.fulfill({ status: 503, json: { message: 'Analytics unavailable in the isolated fixture' } })
    if (path === '/api/admin/alerts') return route.fulfill({ json: [] })
    if (path === '/api/admin/social-posts' && request.method() === 'GET') {
      const currentPage = Number(url.searchParams.get('page') || 1)
      reads.push(currentPage)
      if (currentPage === 2 && failSecondPage) return route.fulfill({ status: 503, json: { message: 'Historique temporairement indisponible.' } })
      const pageSize = Number(url.searchParams.get('pageSize') || 100)
      return route.fulfill({ json: {
        posts: posts.slice((currentPage - 1) * pageSize, currentPage * pageSize), connections: [],
        pagination: { page: currentPage, pageSize, total: posts.length, totalPages: Math.max(1, Math.ceil(posts.length / pageSize)), hasMore: currentPage * pageSize < posts.length },
      } })
    }
    const post = posts.find(item => path === `/api/admin/social-posts/${item.id}` || path === `/api/admin/social-posts/${item.id}/approve`)
    if (post && request.method() === 'PUT') {
      const body = request.postDataJSON()
      expect(body).toMatchObject({ action: 'plan', version: post.version })
      Object.assign(post, { planned_at: body.planned_at, version: post.version + 1, updated_at: now })
      return route.fulfill({ json: post })
    }
    if (post && path.endsWith('/approve') && request.method() === 'POST') {
      const body = request.postDataJSON()
      expect(body).toMatchObject({ version: post.version, confirmation: 'PROGRAMMER_DATE_PERSONNALISEE', mode: 'scheduled' })
      Object.assign(post, { content: body.content, status: 'approved', publication_mode: 'automatic', version: post.version + 1, approved_version: post.version + 1, publish_after: body.publish_after })
      return route.fulfill({ json: post })
    }
    unexpected.push(`${request.method()} ${path}`)
    return route.fulfill({ status: 500, json: { message: 'Unexpected ANT39 fixture request' } })
  })

  const timestamp = Math.floor(Date.parse(now) / 1000)
  const user = { id: '00000000-0000-0000-0000-000000000039', email: 'ant39@example.invalid', aud: 'authenticated', role: 'authenticated', factors: [], app_metadata: {}, user_metadata: {}, identities: [], created_at: now }
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
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    unexpected.push(`${request.method()} ${url.pathname}`)
    return route.fulfill({ status: 500, json: { message: 'Unexpected ANT39 auth request' } })
  })
  await page.goto('/admin/login?redirect=/admin/social')
  await waitForAdminLoginReady(page)
  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/mot de passe/i).fill('synthetic-browser-only-password')
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(url => url.pathname.replace(/\/$/, '') === '/admin/social')
  await expect.poll(() => reads.length).toBeGreaterThan(0)
  return { posts, writes, reads, unexpected, allowSecondPage: () => { failSecondPage = false } }
}

test('editorial calendar reads beyond 100 posts and filters the full history without writes', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  const posts = Array.from({ length: 101 }, (_, index) => makePost(index, { platform: index === 100 ? 'instagram' : 'linkedin' }))
  posts[0] = makePost(0, { platform: 'linkedin', planned_at: '2026-10-20T08:00:00.000Z' })
  posts[1] = makePost(1, { platform: 'x', status: 'approved', publication_mode: 'automatic', approved_version: 1, publish_after: '2026-10-21T16:00:00.000Z' })
  posts[2] = makePost(2, { platform: 'instagram', status: 'published', published_at: '2026-10-19T07:00:00.000Z' })
  posts[3] = makePost(3, { platform: 'instagram', media_images: [{ url: `${mediaRoot}3.jpg`, alt: 'Visuel du brouillon ANT39' }] })
  posts[4] = makePost(4, { platform: 'linkedin', planned_at: '2026-11-01T09:00:00.000Z' })
  posts[100] = makePost(100, { platform: 'instagram', article_title: 'ANT39 ancien brouillon retrouvé' })
  const state = await openCalendar(page, posts)
  const oldPost = page.getByRole('button', { name: 'Ouvrir ANT39 ancien brouillon retrouvé sur Instagram', exact: true })
  await expect(oldPost).toBeVisible()
  expect(state.reads).toEqual([1, 2])
  await page.getByRole('region', { name: 'Calendrier éditorial', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/tmp/ant39-calendar-desktop.png' })
  await page.getByLabel('Vue du calendrier', { exact: true }).selectOption({ label: 'Mois' })
  await expect(page.getByRole('button', { name: 'Ouvrir ANT39 publication 4 sur LinkedIn', exact: true })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'sur cette période' })).toContainText('3 sur cette période')
  await page.getByLabel('Vue du calendrier', { exact: true }).selectOption({ label: 'Liste' })
  await page.getByLabel('Filtrer par réseau', { exact: true }).selectOption({ label: 'Instagram' })
  await expect(oldPost).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ouvrir ANT39 publication 0 sur LinkedIn', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ouvrir ANT39 publication 2 sur Instagram', exact: true })).toBeVisible()
  await page.getByLabel('Filtrer par statut', { exact: true }).selectOption({ label: 'À valider' })
  await expect(page.getByRole('button', { name: 'Ouvrir ANT39 publication 2 sur Instagram', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ouvrir ANT39 publication 3 sur Instagram', exact: true })).toBeVisible()
  await page.getByLabel('Filtrer par format', { exact: true }).selectOption({ label: 'Texte' })
  await expect(page.getByRole('button', { name: 'Ouvrir ANT39 publication 3 sur Instagram', exact: true })).toHaveCount(0)
  await expect(oldPost).toBeVisible()
  await page.getByLabel('Rechercher une publication', { exact: true }).fill('ancien brouillon')
  await expect(page).toHaveURL(url => ['view', 'platform', 'status', 'format', 'search'].every((key, index) =>
    url.searchParams.get(key) === ['list', 'instagram', 'review', 'text', 'ancien brouillon'][index]))
  await page.reload()
  await expect(page.getByLabel('Vue du calendrier', { exact: true })).toHaveValue('list')
  await expect(page.getByLabel('Filtrer par réseau', { exact: true })).toHaveValue('instagram')
  await expect(page.getByLabel('Filtrer par statut', { exact: true })).toHaveValue('review')
  await expect(page.getByLabel('Filtrer par format', { exact: true })).toHaveValue('text')
  await oldPost.click()
  const editor = page.getByRole('dialog', { name: 'Publication Instagram', exact: true })
  await expect(editor.getByLabel('Texte Instagram', { exact: true })).toHaveValue(posts[100]!.content)
  await expect(editor.getByText('À valider', { exact: true })).toBeVisible()
  expect(state.writes).toEqual([])
  expect(state.unexpected).toEqual([])
  await editor.getByRole('button', { name: 'Fermer la publication', exact: true }).click()
  await expect(editor).toHaveCount(0)
  await page.getByLabel('Filtrer par réseau', { exact: true }).selectOption({ label: 'LinkedIn' })
  await page.getByLabel('Filtrer par statut', { exact: true }).selectOption({ label: 'Tous les statuts' })
  await page.locator('header').getByRole('link', { name: 'Analyses', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Performance commerciale', exact: true })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Les statistiques sont indisponibles' })).toBeVisible()
  await expect(page).toHaveURL(url => url.pathname === '/admin/analytics' && url.search === '')
  expect(state.writes).toEqual([])
  expect(state.unexpected).toEqual([])
})

test('an unavailable history page is explicit and retry restores all posts', async ({ page }) => {
  test.setTimeout(120_000)
  const posts = Array.from({ length: 101 }, (_, index) => makePost(index))
  const state = await openCalendar(page, posts, { failSecondPage: true })
  await expect(page.getByRole('alert').filter({ hasText: 'Historique temporairement indisponible.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ouvrir ANT39 publication 0 sur X', exact: true })).toHaveCount(0)
  state.allowSecondPage()
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ouvrir ANT39 publication 100 sur X', exact: true })).toBeVisible()
  expect(state.reads.filter(page => page === 1)).toHaveLength(2)
  expect(state.reads.slice(-2)).toEqual([1, 2])
  expect(state.writes).toEqual([])
  expect(state.unexpected).toEqual([])
})

test('planning a draft saves its Zurich date without approving or publishing it', async ({ page }) => {
  test.setTimeout(120_000)
  const post = makePost(1, { article_title: 'ANT39 plan éditorial' })
  const state = await openCalendar(page, [post])
  await page.getByRole('button', { name: 'Ouvrir ANT39 plan éditorial sur X', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Publication X', exact: true })
  const unsavedText = 'Texte encore en cours de rédaction. https://www.antoinequarroz.ch/'
  await editor.getByLabel('Texte X', { exact: true }).fill(unsavedText)
  await editor.getByLabel('Date de publication souhaitée', { exact: true }).fill('2026-10-22T18:30')
  await editor.getByRole('button', { name: 'Enregistrer la date', exact: true }).click()
  await expect.poll(() => state.writes.length).toBe(1)
  expect(state.writes).toEqual([{ method: 'PUT', path: `/api/admin/social-posts/${post.id}`, body: { action: 'plan', planned_at: '2026-10-22T16:30:00.000Z', version: 1 } }])
  expect(state.posts[0]).toMatchObject({ status: 'draft', publication_mode: 'manual', approved_version: null, publish_after: null, planned_at: '2026-10-22T16:30:00.000Z', version: 2 })
  expect(state.posts[0]!.content).toBe(post.content)
  await expect(editor.getByLabel('Texte X', { exact: true })).toHaveValue(unsavedText)
  await expect(editor.getByText('À valider', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(url => url.searchParams.get('postId') === post.id)
  await page.reload()
  await expect(editor.getByLabel('Date de publication souhaitée', { exact: true })).toHaveValue('2026-10-22T18:30')
  expect(state.writes).toHaveLength(1)
  expect(state.unexpected).toEqual([])
})

test('custom scheduling requires a separate confirmed preview and sends the selected UTC instant once', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  const post = makePost(2, { platform: 'instagram', article_title: 'ANT39 carrousel à programmer', media_images: [1, 2].map(index => ({ url: `${mediaRoot}${index}.jpg`, alt: `Visuel ANT39 ${index}` })) })
  const state = await openCalendar(page, [post])
  await page.getByRole('button', { name: 'Ouvrir ANT39 carrousel à programmer sur Instagram', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Publication Instagram', exact: true })
  await editor.getByRole('region', { name: 'Aperçu Instagram', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/tmp/ant39-instagram-preview-mobile.png' })
  await editor.getByRole('button', { name: 'Programmer', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Programmer la publication', exact: true })
  await expect(confirmation.getByRole('img')).toHaveCount(2)
  await expect(confirmation).toContainText(post.content)
  await confirmation.getByLabel('Date et heure de publication', { exact: true }).fill('2026-10-22T18:30')
  const submit = confirmation.getByRole('button', { name: 'Valider la programmation', exact: true })
  await expect(submit).toBeDisabled()
  await confirmation.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(confirmation).toHaveCount(0)
  expect(state.writes).toEqual([])

  await editor.getByRole('button', { name: 'Programmer', exact: true }).click()
  await confirmation.getByLabel('Date et heure de publication', { exact: true }).fill('2026-10-22T18:30')
  await expect(confirmation.getByRole('checkbox')).not.toBeChecked()
  await expect(submit).toBeDisabled()
  await confirmation.getByRole('checkbox').check()
  await expect(submit).toBeEnabled()
  await confirmation.getByLabel('Date et heure de publication', { exact: true }).fill('2026-10-23T18:30')
  await expect(confirmation.getByRole('checkbox')).not.toBeChecked()
  await expect(submit).toBeDisabled()
  await confirmation.getByLabel('Date et heure de publication', { exact: true }).fill('2026-10-22T18:30')
  await confirmation.getByRole('checkbox').check()
  await submit.click()
  await expect(confirmation).toHaveCount(0)
  expect(state.writes).toEqual([{ method: 'POST', path: `/api/admin/social-posts/${post.id}/approve`, body: { mode: 'scheduled', confirmation: 'PROGRAMMER_DATE_PERSONNALISEE', content: post.content, version: 1, publish_after: '2026-10-22T16:30:00.000Z' } }])
  expect(state.posts[0]).toMatchObject({ status: 'approved', publication_mode: 'automatic', approved_version: 2, publish_after: '2026-10-22T16:30:00.000Z', planned_at: null })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(state.unexpected).toEqual([])
})
