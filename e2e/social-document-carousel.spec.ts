import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { waitForAdminLoginReady } from './helpers/admin-login-ready'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })

const documentUrl = 'https://www.antoinequarroz.ch/social/physiobaur-projet-dark-v2.pdf'
const previewRoot = documentUrl.slice(0, -4) + '/'
const assetRoot = resolve(process.cwd(), 'public/social/physiobaur-projet-dark-v2')
const manifest = JSON.parse(readFileSync(resolve(assetRoot, 'manifest.json'), 'utf8'))

async function openMockedDocument(page: Page, options: { manifestMissing?: boolean, imageMissing?: boolean } = {}) {
  const writes: string[] = []
  const previewRequests: string[] = []
  const post = {
    id: '00000000-0000-0000-0000-000000000931', studioContentId: null, platform: 'linkedin',
    article_title: 'PhysioBaur · projet en six pages', article_url: 'https://www.antoinequarroz.ch/',
    content: 'Un site pensé pour les patients de PhysioBaur. Parlons de votre projet.',
    status: 'draft', version: 1, publication_mode: 'manual', approved_version: null,
    media_kind: 'document', media_url: documentUrl, media_title: 'PhysioBaur · présentation du projet',
    publish_after: null, media_images: [], media_items: [],
  }
  await page.route(`${previewRoot}**`, route => {
    const filename = new URL(route.request().url()).pathname.split('/').at(-1)!
    previewRequests.push(filename)
    if (filename === 'manifest.json') return options.manifestMissing
      ? route.fulfill({ status: 404, json: { message: 'Preview unavailable' } })
      : route.fulfill({ json: manifest })
    if (!/^slide-[1-6]\.png$/.test(filename) || (options.imageMissing && filename === 'slide-1.png')) return route.fulfill({ status: 404 })
    return route.fulfill({ contentType: 'image/png', body: readFileSync(resolve(assetRoot, filename)) })
  })
  await page.route(documentUrl, route => route.fulfill({
    contentType: 'application/pdf', body: readFileSync(resolve(process.cwd(), 'public/social/physiobaur-projet-dark-v2.pdf')),
  }))
  await page.route('**/api/admin/**', route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() !== 'GET') writes.push(`${request.method()} ${path}`)
    if (path === '/api/admin/organizations') return route.fulfill({ json: [{ id: 'ant31-test-org', name: 'ANT-31 sandbox', slug: 'ant31', role: 'owner' }] })
    if (path === '/api/admin/social-posts') return route.fulfill({ json: { posts: [post], connections: [] } })
    if (path === '/api/admin/social-insights') return route.fulfill({ json: { instagram: null, receivedAt: null } })
    if (path === '/api/admin/social-site-stats') return route.fulfill({ json: { available: false, configured: false, rows: [] } })
    if (path === '/api/admin/alerts') return route.fulfill({ json: [] })
    return route.fulfill({ status: 500, json: { message: `Unexpected mock request: ${request.method()} ${path}` } })
  })

  // All auth and admin requests are simulated before the hydrated form is used.
  const now = Math.floor(Date.now() / 1000)
  const user = { id: '00000000-0000-0000-0000-000000000031', email: 'ant31@example.invalid', aud: 'authenticated', role: 'authenticated', factors: [], app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() }
  const accessToken = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', aal: 'aal2', exp: now + 3600, iat: now })).toString('base64url'),
    Buffer.from('synthetic-browser-only-signature').toString('base64url'),
  ].join('.')
  let signIns = 0
  await page.route('**/auth/v1/**', route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/token') && url.searchParams.get('grant_type') === 'password') {
      expect(request.postDataJSON()).toMatchObject({ email: user.email, password: 'synthetic-browser-only-password' })
      signIns++
      return route.fulfill({ json: { access_token: accessToken, refresh_token: 'synthetic-browser-only-refresh', expires_at: now + 3600, expires_in: 3600, token_type: 'bearer', user } })
    }
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    return route.fulfill({ status: 500, json: { message: `Unexpected mock auth request: ${request.method()} ${url.pathname}` } })
  })
  await page.goto('/admin/login?redirect=/admin/social')
  await waitForAdminLoginReady(page)
  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/mot de passe/i).fill('synthetic-browser-only-password')
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(url => url.pathname.replace(/\/$/, '') === '/admin/social')
  expect(signIns).toBe(1)
  await page.getByRole('button', { name: `Ouvrir ${post.article_title} sur LinkedIn`, exact: true }).click()
  const card = page.getByRole('dialog', { name: 'Publication LinkedIn', exact: true })
  await expect(card).toBeVisible()
  return { card, preview: card.getByRole('region', { name: 'Carrousel LinkedIn joint', exact: true }), writes, previewRequests }
}

test('LinkedIn preview shows the six square PDF pages in order without cropping on mobile', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  const { card, preview, writes, previewRequests } = await openMockedDocument(page)
  await expect(preview.getByRole('img')).toHaveCount(6)
  expect(await preview.getByRole('img').evaluateAll(images => images.map(image => image.getAttribute('src')))).toEqual(
    Array.from({ length: 6 }, (_, index) => `${previewRoot}slide-${index + 1}.png`),
  )
  const firstImage = preview.getByRole('img').first()
  await expect.poll(() => firstImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1080)
  const dimensions = await firstImage.evaluate(image => ({
    naturalWidth: (image as HTMLImageElement).naturalWidth,
    naturalHeight: (image as HTMLImageElement).naturalHeight,
    width: image.getBoundingClientRect().width,
    height: image.getBoundingClientRect().height,
    fit: getComputedStyle(image).objectFit,
    aspectRatio: getComputedStyle(image).aspectRatio,
  }))
  expect(dimensions.naturalWidth).toBe(dimensions.naturalHeight)
  expect(dimensions.height).toBeCloseTo(dimensions.width, 0)
  expect(dimensions.fit).toBe('contain')
  expect(dimensions.aspectRatio).toBe('auto')
  await preview.locator('figcaption').last().scrollIntoViewIfNeeded()
  await expect(preview.locator('figcaption').last()).toHaveText('6 / 6')
  await expect(preview.getByText('Fais défiler horizontalement pour relire les 6 pages avant publication.', { exact: true })).toBeVisible()
  await expect(preview.getByRole('link', { name: 'Ouvrir le PDF ↗', exact: true })).toHaveAttribute('href', documentUrl)
  expect(previewRequests).not.toContain('slide-7.png')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await expect(card.getByText('À valider', { exact: true })).toBeVisible()
  expect(writes).toEqual([])
})

for (const missing of ['manifest', 'image'] as const) {
  test(`LinkedIn preview keeps the PDF review link when its ${missing} is missing`, async ({ page }) => {
    test.setTimeout(120_000)
    const { card, preview, writes } = await openMockedDocument(page, { manifestMissing: missing === 'manifest', imageMissing: missing === 'image' })
    await expect(preview.getByRole('status')).toHaveText('Aperçu indisponible. Ouvre le PDF pour relire le carrousel avant de valider.')
    await expect(preview.getByRole('link', { name: 'Ouvrir le PDF ↗', exact: true })).toHaveAttribute('href', documentUrl)
    await expect(preview.getByRole('img')).toHaveCount(0)
    await expect(card.getByText('À valider', { exact: true })).toBeVisible()
    expect(writes).toEqual([])
  })
}
