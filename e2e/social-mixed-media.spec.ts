import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })

// A tiny, silent H.264 fixture keeps previews and uploads entirely local.
const videoFixture = Buffer.from('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', 'base64')
const imageFixture = readFileSync(resolve(process.cwd(), 'public/social/physiobaur/01-PhysioBaur.jpg'))
const mediaRoot = 'https://www.antoinequarroz.ch/social/physiobaur/ant30/'
const media = [
  { type: 'image', url: `${mediaRoot}01.jpg`, alt: 'Présentation du projet PhysioBaur' },
  { type: 'video', url: `${mediaRoot}02.mp4`, alt: 'Défilement du site PhysioBaur sur ordinateur' },
  { type: 'image', url: `${mediaRoot}03.jpg`, alt: 'Les informations du cabinet aux bons endroits' },
  { type: 'video', url: `${mediaRoot}04.mp4`, alt: 'Défilement du site PhysioBaur sur mobile' },
  { type: 'image', url: `${mediaRoot}05.jpg`, alt: 'Témoignage de Christophe Baur' },
  { type: 'image', url: `${mediaRoot}06.jpg`, alt: 'Parlons de votre projet' },
]
type Write = { method: string, path: string, body: any }

async function openMockedDraft(page: Page, { initialMedia = media, initialTitle = 'PhysioBaur · carrousel mixte', plannedAt = null }: {
  initialMedia?: typeof media, initialTitle?: string, plannedAt?: string | null,
} = {}) {
  const writes: Write[] = []
  let post = {
    id: '00000000-0000-0000-0000-000000000930', studioContentId: null, platform: 'instagram',
    article_title: initialTitle, article_url: 'https://www.antoinequarroz.ch/',
    content: 'Un site pensé pour les patients de PhysioBaur. Parlons de votre projet.',
    status: 'draft', version: 1, publication_mode: 'manual', approved_version: null,
    media_kind: null, media_url: null, media_title: null, publish_after: null, planned_at: plannedAt,
    media_images: [], media_items: initialMedia.map(item => ({ ...item })),
  }
  await page.route(`${mediaRoot}**`, route => route.fulfill({
    contentType: route.request().url().endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
    body: route.request().url().endsWith('.mp4') ? videoFixture : imageFixture,
  }))
  await page.route('**/api/admin/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() !== 'GET') writes.push({ method: request.method(), path, body: request.postDataJSON() })
    if (path === '/api/admin/organizations') return route.fulfill({ json: [{ id: 'ant30-test-org', name: 'ANT-30 sandbox', slug: 'ant30', role: 'owner' }] })
    if (path === '/api/admin/social-posts') return route.fulfill({ json: { posts: [post], connections: [] } })
    if (path === '/api/admin/social-insights') return route.fulfill({ json: { instagram: null, receivedAt: null } })
    if (path === '/api/admin/social-site-stats') return route.fulfill({ json: { available: false, configured: false, rows: [] } })
    if (path === '/api/admin/alerts') return route.fulfill({ json: [] })
    if (path === `/api/admin/social-posts/${post.id}/media` && request.method() === 'PUT') {
      const body = request.postDataJSON()
      expect(body.version).toBe(post.version)
      post = { ...post, version: post.version + 1, media_items: body.media, media_images: [], publication_mode: 'manual', approved_version: null, publish_after: null }
      return route.fulfill({ json: post })
    }
    if (path === '/api/admin/social-video-upload') return route.fulfill({ json: { url: `${mediaRoot}07.mp4` } })
    return route.fulfill({ status: 500, json: { message: `Unexpected mock request: ${request.method()} ${path}` } })
  })

  // Let the hydrated login form and auth SDK establish this synthetic session.
  // Nuxt deletes window.__NUXT__ after reviving its payload, so it cannot be
  // used as a stable runtime configuration source in a production build.
  const now = Math.floor(Date.now() / 1000)
  const user = { id: '00000000-0000-0000-0000-000000000030', email: 'ant30@example.invalid', aud: 'authenticated', role: 'authenticated', factors: [], app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() }
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
  await expect(page.getByLabel(/email/i)).toBeEnabled()
  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/mot de passe/i).fill('synthetic-browser-only-password')
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(url => url.pathname.replace(/\/$/, '') === '/admin/social')
  expect(signIns).toEqual(['password'])
  if (plannedAt) await page.goto(`/admin/social?view=week&date=${plannedAt.slice(0, 10)}`)
  await page.getByRole('button', { name: `Ouvrir ${post.article_title} sur Instagram`, exact: true }).click()
  const card = page.getByRole('dialog', { name: 'Publication Instagram', exact: true })
  const heading = initialMedia.length === 0 ? 'Médias Instagram' : initialMedia.length === 1 ? 'Vidéo Instagram · Reel' : 'Carrousel · 4 images et 2 vidéos'
  await expect(card.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  return { card, writes }
}

test('mixed Instagram draft previews all six ordered media on mobile and waits for publication consent', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  const { card, writes } = await openMockedDraft(page)
  const gallery = card.getByRole('region', { name: 'Médias Instagram joints', exact: true })
  await expect(gallery.getByRole('img')).toHaveCount(4)
  await expect(gallery.locator('video')).toHaveCount(2)
  expect(await gallery.locator('figure').evaluateAll(figures => figures.map(figure => figure.querySelector('video, img')?.getAttribute('src')))).toEqual(media.map(item => item.url))
  for (const video of await gallery.locator('video').all()) {
    await expect(video).toHaveJSProperty('paused', true)
    await expect(video).toHaveJSProperty('muted', true)
    await expect(video).toHaveAttribute('controls', '')
    await expect(video).toHaveAttribute('playsinline', '')
    await expect(video).toHaveAttribute('preload', 'metadata')
    await expect(video).not.toHaveAttribute('autoplay')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(writes).toEqual([])

  await card.getByRole('button', { name: 'Publier maintenant', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Publier maintenant', exact: true })
  await expect(dialog).toContainText('4 images et 2 vidéos')
  await expect(dialog.getByRole('img')).toHaveCount(4)
  await expect(dialog.locator('video')).toHaveCount(2)
  await expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await expect(dialog.getByRole('button', { name: 'Publier maintenant', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(writes).toEqual([])
})

test('reordering and uploading a video require an explicit save without approving the Instagram draft', async ({ page }) => {
  test.setTimeout(120_000)
  const { card, writes } = await openMockedDraft(page)
  await card.getByRole('button', { name: 'Avancer le média 2', exact: true }).click()
  await card.getByLabel('Description du média 1', { exact: true }).fill('Le site du cabinet sur ordinateur, en mode sombre')
  await expect(card.getByRole('button', { name: 'Publier maintenant', exact: true })).toBeDisabled()
  await expect(card.getByRole('button', { name: 'Programmer', exact: true })).toBeDisabled()
  expect(writes).toEqual([])
  await card.getByRole('button', { name: 'Enregistrer les médias', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Enregistrer les médias', exact: true })).toHaveCount(0)
  await expect(card.getByRole('button', { name: 'Publier maintenant', exact: true })).toBeEnabled()
  expect(writes).toHaveLength(1)
  expect(writes[0]).toMatchObject({ method: 'PUT', path: expect.stringMatching(/\/media$/), body: { version: 1, media: [{ ...media[1], alt: 'Le site du cabinet sur ordinateur, en mode sombre' }, media[0], ...media.slice(2)] } })

  await card.getByLabel('Ajouter des images ou vidéos').setInputFiles({ name: 'Démo mobile.mp4', mimeType: 'video/mp4', buffer: videoFixture })
  await expect(card.getByRole('heading', { name: 'Carrousel · 4 images et 3 vidéos', exact: true })).toBeVisible()
  await expect(card.getByRole('button', { name: 'Publier maintenant', exact: true })).toBeDisabled()
  expect(writes).toHaveLength(2)
  expect(writes[1]).toMatchObject({ method: 'POST', path: '/api/admin/social-video-upload', body: { dataUrl: expect.stringMatching(/^data:video\/mp4;base64,/) } })
  await card.getByRole('button', { name: 'Enregistrer les médias', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Enregistrer les médias', exact: true })).toHaveCount(0)
  expect(writes).toHaveLength(3)
  expect(writes[2]).toMatchObject({ method: 'PUT', path: expect.stringMatching(/\/media$/), body: { version: 2, media: expect.arrayContaining([{ type: 'video', url: `${mediaRoot}07.mp4`, alt: 'Démo mobile' }]) } })
  expect(writes.some(write => /\/(?:approve|review-media|review-instagram)$/.test(write.path))).toBe(false)
  await expect(card.getByText('À valider', { exact: true })).toBeVisible()
  await card.getByRole('button', { name: 'Fermer la publication', exact: true }).click()
  await expect(card).toHaveCount(0)
  await page.getByRole('button', { name: 'Ouvrir PhysioBaur · carrousel mixte sur Instagram', exact: true }).click()
  await expect(card.getByRole('heading', { name: 'Carrousel · 4 images et 3 vidéos', exact: true })).toBeVisible()
  const preview = card.getByRole('region', { name: 'Aperçu Instagram', exact: true })
  await preview.getByRole('button', { name: 'Média suivant de l’aperçu', exact: true }).click()
  await expect.poll(() => preview.getByRole('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByText('Médias enregistrés. Le brouillon attend ta validation.', { exact: true })).toHaveCount(0)
  await preview.scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/tmp/ant39-instagram-preview-desktop.png' })
  expect(writes).toHaveLength(3)
})

test('required descriptions and keyboard focus survive removing and clearing the carousel', async ({ page }) => {
  test.setTimeout(120_000)
  const { card, writes } = await openMockedDraft(page)
  const description = card.getByLabel('Description du média 1', { exact: true })
  await description.fill('')
  await expect(description).toHaveAttribute('aria-invalid', 'true')
  await expect(card.getByRole('button', { name: 'Enregistrer les médias', exact: true })).toBeDisabled()
  await description.fill(media[0]!.alt)

  await card.getByRole('button', { name: 'Retirer le média 2', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Retirer le média 2', exact: true })).toBeFocused()
  await expect(card.locator('figure')).toHaveCount(5)
  for (let remaining = 5; remaining > 0; remaining--) {
    await card.getByRole('button', { name: 'Retirer le média 1', exact: true }).click()
    await expect(card.locator('figure')).toHaveCount(remaining - 1)
  }
  await expect(card.getByLabel('Ajouter des images ou vidéos')).toBeFocused()
  await expect(card.getByRole('button', { name: 'Enregistrer les médias', exact: true })).toBeEnabled()
  await card.getByRole('button', { name: 'Enregistrer les médias', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Enregistrer les médias', exact: true })).toHaveCount(0)
  expect(writes).toEqual([{ method: 'PUT', path: '/api/admin/social-posts/00000000-0000-0000-0000-000000000930/media', body: { version: 1, media: [] } }])
  await expect(card.getByRole('button', { name: 'Valider le texte', exact: true })).toBeVisible()
  await expect(card.getByText('À valider', { exact: true })).toBeVisible()
})

for (const viewport of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`a single Instagram video uploads, saves and previews on ${viewport.name} without approving or changing its desired date`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    const title = 'EnvVault · les configurations de mes projets'
    const { card, writes } = await openMockedDraft(page, { initialMedia: [], initialTitle: title, plannedAt: '2026-10-20T16:30:00.000Z' })
    const caption = await card.getByLabel('Texte Instagram', { exact: true }).inputValue()
    const desiredDate = card.getByLabel('Date de publication souhaitée', { exact: true })
    await expect(desiredDate).toHaveValue('2026-10-20T18:30')
    await card.getByLabel('Ajouter des images ou vidéos').setInputFiles({ name: 'EnvVault-instagram.mp4', mimeType: 'video/mp4', buffer: videoFixture })
    await expect(card.getByRole('heading', { name: 'Vidéo Instagram · Reel', exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Enregistrer les médias', exact: true })).toBeEnabled()
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ method: 'POST', path: '/api/admin/social-video-upload' })
    await card.getByLabel('Description du média 1', { exact: true }).fill('EnvVault : retrouver les configurations de ses projets, aperçu vidéo avec voix off')
    await card.getByRole('button', { name: 'Enregistrer les médias', exact: true }).click()
    await expect(card.getByRole('button', { name: 'Enregistrer les médias', exact: true })).toHaveCount(0)
    expect(writes).toHaveLength(2)
    expect(writes[1]).toMatchObject({ method: 'PUT', path: expect.stringMatching(/\/media$/), body: { version: 1, media: [{ type: 'video', url: `${mediaRoot}07.mp4`, alt: 'EnvVault : retrouver les configurations de ses projets, aperçu vidéo avec voix off' }] } })
    expect(Object.keys(writes[1]!.body).sort()).toEqual(['media', 'version'])
    await expect(card.getByText('À valider', { exact: true })).toBeVisible()
    await expect(card.getByLabel('Texte Instagram', { exact: true })).toHaveValue(caption)
    await expect(desiredDate).toHaveValue('2026-10-20T18:30')
    await card.getByRole('button', { name: 'Fermer la publication', exact: true }).click()
    await expect(card).toHaveCount(0)
    await expect(page).toHaveURL(url => !url.searchParams.has('postId'))
    await page.reload()
    await page.getByRole('button', { name: `Ouvrir ${title} sur Instagram`, exact: true }).click()
    await expect(card.getByRole('heading', { name: 'Vidéo Instagram · Reel', exact: true })).toBeVisible()
    const preview = card.getByRole('region', { name: 'Aperçu Instagram', exact: true })
    await expect(preview.locator('video')).toHaveAttribute('src', `${mediaRoot}07.mp4`)
    await expect(preview.locator('video')).toHaveAttribute('controls', '')
    await expect(preview.locator('video')).not.toHaveAttribute('autoplay')
    await expect(preview.getByRole('button', { name: 'Média suivant de l’aperçu', exact: true })).toHaveCount(0)
    const galleryVideo = card.getByRole('region', { name: 'Médias Instagram joints', exact: true }).locator('video')
    await expect(galleryVideo).toHaveJSProperty('paused', true)
    await expect(galleryVideo).toHaveJSProperty('muted', true)
    await galleryVideo.evaluate(async (video: HTMLVideoElement) => { await video.play() })
    await expect.poll(() => galleryVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0)
    await galleryVideo.evaluate((video: HTMLVideoElement) => video.pause())
    await expect(desiredDate).toHaveValue('2026-10-20T18:30')
    await expect(card.getByText('À valider', { exact: true })).toBeVisible()
    expect(writes.some(write => /\/(?:approve|review-media|review-instagram)$/.test(write.path))).toBe(false)
    expect(writes).toHaveLength(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}
