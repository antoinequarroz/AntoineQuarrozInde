import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { waitForAdminLoginReady } from './helpers/admin-login-ready'

// Synthetic browser sessions, local fixture bytes and mocked API boundaries only.
// This spec must never approve or publish a real post or call a social provider.
test.use({ trace: 'off', screenshot: 'off', video: 'off' })

const videoFixture = readFileSync(resolve(process.cwd(), 'e2e/fixtures/social-silent-h264.mp4'))
const root = 'https://www.antoinequarroz.ch/social/linkedin-ant49-fixtures/'
const originalVideo = { type: 'video' as const, url: `${root}original.mp4`, alt: 'AventureTime AQ, prototype de portfolio en trois îles' }
const title = 'AventureTime AQ · prototype 3D'
const caption = 'Trois îles pour découvrir mes passions et mes projets. AventureTime AQ est un prototype personnel en JavaScript, Three.js et Vite.'
const plannedAt = '2026-10-23T07:00:00.000Z'
type Media = typeof originalVideo
type Write = { method: string, path: string, body: any }

async function openMockedLinkedIn(page: Page, initialMedia: Media[] = []) {
  const writes: Write[] = []
  let failUpload = false
  let uploadNumber = 0
  let post = {
    id: '00000000-0000-0000-0000-000000000949', studioContentId: null, platform: 'linkedin',
    article_title: title, article_url: 'https://aventuretime.antoinequarroz.ch/', content: caption,
    status: 'draft', version: 1, publication_mode: 'manual', approved_version: null,
    approval_fingerprint: null, media_kind: null, media_url: null, media_title: null,
    publish_after: null, planned_at: plannedAt, media_images: [], media_items: initialMedia.map(item => ({ ...item })),
  }
  await page.route(`${root}**`, route => route.fulfill({ contentType: 'video/mp4', body: videoFixture }))
  await page.route('**/api/admin/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() !== 'GET') writes.push({ method: request.method(), path, body: request.postDataJSON() })
    if (path === '/api/admin/organizations') return route.fulfill({ json: [{ id: 'ant49-test-org', name: 'ANT-49 sandbox', slug: 'ant49', role: 'owner' }] })
    if (path === '/api/admin/social-posts') return route.fulfill({ json: { posts: [post], connections: [] } })
    if (path === '/api/admin/social-insights') return route.fulfill({ json: { instagram: null, receivedAt: null } })
    if (path === '/api/admin/social-site-stats') return route.fulfill({ json: { available: false, configured: false, rows: [] } })
    if (path === '/api/admin/alerts') return route.fulfill({ json: [] })
    if (path === '/api/admin/social-video-upload' && request.method() === 'POST') {
      if (failUpload) return route.fulfill({ status: 422, json: { message: 'Vidéo refusée par la vérification locale.' } })
      uploadNumber += 1
      return route.fulfill({ json: { url: `${root}uploaded-${uploadNumber}.mp4` } })
    }
    if (path === `/api/admin/social-posts/${post.id}/media` && request.method() === 'PUT') {
      const body = request.postDataJSON()
      expect(Object.keys(body).sort()).toEqual(['media', 'version'])
      expect(body.version).toBe(post.version)
      post = { ...post, media_items: body.media, media_images: [], version: post.version + 1,
        status: 'draft', publication_mode: 'manual', approved_version: null, approval_fingerprint: null, publish_after: null }
      return route.fulfill({ json: post })
    }
    return route.fulfill({ status: 500, json: { message: `Unexpected mock request: ${request.method()} ${path}` } })
  })

  // The existing mounted-login helper and the same browser-only synthetic
  // session contract as the mixed-media tests avoid any production credentials.
  const now = Math.floor(Date.now() / 1000)
  const user = { id: '00000000-0000-0000-0000-000000000049', email: 'ant49@example.invalid', aud: 'authenticated', role: 'authenticated', factors: [], app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() }
  const jwt = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', aal: 'aal2', exp: now + 3600, iat: now })).toString('base64url'),
    Buffer.from('synthetic-browser-only-signature').toString('base64url'),
  ].join('.')
  const session = { access_token: jwt, refresh_token: 'synthetic-browser-only-refresh', expires_at: now + 3600, expires_in: 3600, token_type: 'bearer', user }
  const signIns: string[] = []
  await page.route('**/auth/v1/**', route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/token') && url.searchParams.get('grant_type') === 'password') {
      expect(request.postDataJSON()).toMatchObject({ email: user.email, password: 'synthetic-browser-only-password' })
      signIns.push('password')
      return route.fulfill({ json: session })
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
  expect(signIns).toEqual(['password'])
  await page.goto('/admin/social?view=week&date=2026-10-23')
  const open = () => page.getByRole('button', { name: `Ouvrir ${title} sur LinkedIn`, exact: true }).click()
  await open()
  const card = page.getByRole('dialog', { name: 'Publication LinkedIn', exact: true })
  await expect(card.getByRole('heading', { name: title, exact: true })).toBeVisible()
  return { card, writes, open, getPost: () => structuredClone(post), setUploadFailure: (value: boolean) => { failUpload = value } }
}

async function expectSafeVideo(video: Locator, url: string) {
  await expect(video).toHaveAttribute('src', url)
  await expect(video).toHaveAttribute('controls', '')
  await expect(video).toHaveAttribute('playsinline', '')
  await expect(video).toHaveAttribute('preload', 'metadata')
  await expect(video).not.toHaveAttribute('autoplay')
  await expect(video).toHaveJSProperty('paused', true)
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).videoWidth)).toBeGreaterThan(0)
}

function expectNoApproval(writes: Write[]) {
  expect(writes.some(write => /\/(?:approve|review-media|review-instagram|publish)$/.test(write.path))).toBe(false)
}

for (const viewport of [{ name: 'desktop', width: 1365, height: 980 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`LinkedIn video upload stays a draft and preserves caption and date on ${viewport.name}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await page.setViewportSize(viewport)
    const { card, writes, open, getPost } = await openMockedLinkedIn(page)
    await card.getByRole('button', { name: 'Joindre une vidéo LinkedIn', exact: true }).click()
    const gallery = card.getByRole('region', { name: 'Médias LinkedIn joints', exact: true })
    await expect(gallery.getByRole('heading', { name: 'Vidéo LinkedIn', exact: true })).toBeVisible()
    await expect(gallery.getByLabel('Ajouter une vidéo LinkedIn', { exact: true })).toHaveAttribute('accept', 'video/mp4')
    expect(writes).toEqual([])
    await gallery.getByLabel('Ajouter une vidéo LinkedIn', { exact: true }).setInputFiles({ name: 'AventureTime-AQ-LinkedIn-4x5.mp4', mimeType: 'video/mp4', buffer: videoFixture })
    await expect(gallery.locator('video')).toHaveCount(1)
    await gallery.getByLabel('Description du média 1', { exact: true }).fill(originalVideo.alt)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ method: 'POST', path: '/api/admin/social-video-upload', body: { dataUrl: expect.stringMatching(/^data:video\/mp4;base64,/) } })
    await expect(card.getByRole('button', { name: 'Publier maintenant', exact: true })).toBeDisabled()
    await expect(card.getByRole('button', { name: 'Programmer', exact: true })).toBeDisabled()
    await gallery.getByRole('button', { name: 'Enregistrer les médias', exact: true }).click()
    await expect(gallery.getByRole('button', { name: 'Enregistrer les médias', exact: true })).toHaveCount(0)
    expect(writes).toHaveLength(2)
    expect(writes[1]).toMatchObject({ method: 'PUT', path: expect.stringMatching(/\/media$/), body: { version: 1, media: [{ ...originalVideo, url: `${root}uploaded-1.mp4` }] } })
    expect(getPost()).toMatchObject({ status: 'draft', publication_mode: 'manual', approved_version: null, approval_fingerprint: null, publish_after: null, content: caption, planned_at: plannedAt })
    await expect(card.getByText('À valider', { exact: true })).toBeVisible()
    await expect(card.getByLabel('Texte LinkedIn', { exact: true })).toHaveValue(caption)
    await expect(card.getByLabel('Date de publication souhaitée', { exact: true })).toHaveValue('2026-10-23T09:00')
    await expect(card.getByRole('button', { name: 'Publier maintenant', exact: true })).toHaveCount(0)
    await expect(card.getByRole('button', { name: 'Programmer', exact: true })).toHaveCount(0)
    const preview = card.getByRole('region', { name: 'Aperçu LinkedIn', exact: true })
    await expectSafeVideo(preview.locator('video'), `${root}uploaded-1.mp4`)
    await expectSafeVideo(gallery.locator('video'), `${root}uploaded-1.mp4`)
    await expect(gallery.locator('video')).toHaveJSProperty('muted', true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await card.getByRole('button', { name: 'Fermer la publication', exact: true }).click()
    await expect(card).toHaveCount(0)
    await expect(page).toHaveURL(url => !url.searchParams.has('postId'))
    await page.reload()
    await open()
    await expectSafeVideo(card.getByRole('region', { name: 'Aperçu LinkedIn', exact: true }).locator('video'), `${root}uploaded-1.mp4`)
    await expect(card.getByLabel('Texte LinkedIn', { exact: true })).toHaveValue(caption)
    await card.getByRole('button', { name: 'Valider pour publication manuelle', exact: true }).click()
    const confirmation = page.getByRole('dialog', { name: 'Valider le texte et les visuels', exact: true })
    await expect(confirmation.getByRole('checkbox')).not.toBeChecked()
    await expect(confirmation.getByRole('button', { name: 'Valider l’ensemble', exact: true })).toBeDisabled()
    await expect(confirmation).toContainText('La publication reste manuelle, sans envoi ni programmation.')
    await expectSafeVideo(confirmation.locator('video'), `${root}uploaded-1.mp4`)
    await page.keyboard.press('Escape')
    await expect(confirmation).toHaveCount(0)
    expect(writes).toHaveLength(2)
    expectNoApproval(writes)
    await expect(card.getByText('À valider', { exact: true })).toBeVisible()
    await card.screenshot({ path: testInfo.outputPath(`linkedin-video-${viewport.name}.png`) })
  })
}

test('failed LinkedIn video replacement keeps the previous media, then a successful replacement remains unapproved', async ({ page }) => {
  test.setTimeout(120_000)
  const { card, writes, getPost, setUploadFailure } = await openMockedLinkedIn(page, [originalVideo])
  const gallery = card.getByRole('region', { name: 'Médias LinkedIn joints', exact: true })
  const preview = card.getByRole('region', { name: 'Aperçu LinkedIn', exact: true })
  setUploadFailure(true)
  await gallery.getByLabel('Remplacer la vidéo', { exact: true }).setInputFiles({ name: 'Replacement.mp4', mimeType: 'video/mp4', buffer: videoFixture })
  await expect(gallery.getByRole('alert')).toHaveText('Vidéo refusée par la vérification locale.')
  await expectSafeVideo(gallery.locator('video'), originalVideo.url)
  await expectSafeVideo(preview.locator('video'), originalVideo.url)
  await expect(gallery.getByRole('button', { name: 'Enregistrer les médias', exact: true })).toHaveCount(0)
  expect(getPost().media_items).toEqual([originalVideo])
  expect(writes).toHaveLength(1)
  setUploadFailure(false)
  await gallery.getByLabel('Remplacer la vidéo', { exact: true }).setInputFiles({ name: 'Replacement.mp4', mimeType: 'video/mp4', buffer: videoFixture })
  await expect(gallery.getByRole('alert')).toHaveCount(0)
  await expect(gallery.locator('video')).toHaveCount(1)
  await expectSafeVideo(gallery.locator('video'), `${root}uploaded-1.mp4`)
  await expectSafeVideo(preview.locator('video'), originalVideo.url)
  await expect(card.getByRole('button', { name: 'Valider pour publication manuelle', exact: true })).toBeDisabled()
  await gallery.getByRole('button', { name: 'Enregistrer les médias', exact: true }).click()
  await expect(gallery.getByRole('button', { name: 'Enregistrer les médias', exact: true })).toHaveCount(0)
  expect(writes).toHaveLength(3)
  expect(writes[2]).toMatchObject({ method: 'PUT', body: { version: 1, media: [{ type: 'video', url: `${root}uploaded-1.mp4`, alt: 'Replacement' }] } })
  expect(getPost()).toMatchObject({ status: 'draft', approved_version: null, publish_after: null, publication_mode: 'manual', content: caption, planned_at: plannedAt })
  await expectSafeVideo(preview.locator('video'), `${root}uploaded-1.mp4`)
  expectNoApproval(writes)
})

test('removing the LinkedIn video saves an empty media list without altering the caption or date', async ({ page }) => {
  test.setTimeout(120_000)
  const { card, writes, getPost } = await openMockedLinkedIn(page, [originalVideo])
  const gallery = card.getByRole('region', { name: 'Médias LinkedIn joints', exact: true })
  const preview = card.getByRole('region', { name: 'Aperçu LinkedIn', exact: true })
  await gallery.getByRole('button', { name: 'Retirer le média 1', exact: true }).click()
  await expect(gallery.locator('video')).toHaveCount(0)
  await expectSafeVideo(preview.locator('video'), originalVideo.url)
  expect(writes).toEqual([])
  await gallery.getByRole('button', { name: 'Enregistrer les médias', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Joindre une vidéo LinkedIn', exact: true })).toBeVisible()
  expect(writes).toEqual([{ method: 'PUT', path: expect.stringMatching(/\/media$/), body: { version: 1, media: [] } }])
  expect(getPost()).toMatchObject({ media_items: [], media_images: [], status: 'draft', publication_mode: 'manual', approved_version: null, publish_after: null, content: caption, planned_at: plannedAt })
  await expect(preview.locator('video')).toHaveCount(0)
  await expect(card.getByLabel('Texte LinkedIn', { exact: true })).toHaveValue(caption)
  await expect(card.getByLabel('Date de publication souhaitée', { exact: true })).toHaveValue('2026-10-23T09:00')
  expectNoApproval(writes)
})
