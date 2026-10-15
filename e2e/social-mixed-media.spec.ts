import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })

// A tiny, silent H.264 fixture keeps previews and uploads entirely local.
const videoFixture = Buffer.from('AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAaSbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAC7gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAABb10cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAC7gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAKAAAADIAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAu4AAAEAAABAAAAAAU1bWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAwAAAAkABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAAE4G1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAABKBzdGJsAAAAwHN0c2QAAAAAAAAAAQAAALBhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAKAAyABIAAAASAAAAAAAAAABFExhdmM2My4xLjEwMSBsaWJ4MjY0AAAAAAAAAAAAAAAAGP//AAAANmF2Y0MBZAAM/+EAGWdkAAys2UKG/lwEQAAAAwBAAAAMA8UKZYABAAZo6+PLIsD9+PgAAAAAEHBhc3AAAAABAAAAAQAAABRidHJ0AAAAAAAAE10AAAAAAAAAGHN0dHMAAAAAAAAAAQAAAEgAAAIAAAAAFHN0c3MAAAAAAAAAAQAAAAEAAAJIY3R0cwAAAAAAAABHAAAAAQAABAAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACAAAAAACAAACAAAAABxzdHNjAAAAAAAAAAEAAAABAAAASAAAAAEAAAE0c3RzegAAAAAAAAAAAAAASAAAAuwAAAAQAAAADQAAAA0AAAANAAAAFgAAAA8AAAANAAAADQAAABYAAAAPAAAADQAAAA0AAAAWAAAADwAAAA0AAAANAAAAFgAAAA8AAAANAAAADQAAABYAAAAPAAAADQAAAA0AAAAWAAAADwAAAA0AAAANAAAAFgAAAA8AAAANAAAADQAAABYAAAAPAAAADQAAAA0AAAAWAAAADwAAAA0AAAANAAAAFgAAAA8AAAANAAAADQAAABYAAAAPAAAADQAAAA0AAAAWAAAADwAAAA0AAAANAAAAFgAAAA8AAAANAAAADQAAABYAAAAPAAAADQAAAA0AAAAWAAAADwAAAA0AAAANAAAAFQAAAA8AAAANAAAADQAAABUAAAAPAAAADQAAABRzdGNvAAAAAAAAAAEAAAbCAAAAYXVkdGEAAABZbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAsaWxzdAAAACSpdG9vAAAAHGRhdGEAAAABAAAAAExhdmY2My4xLjEwMQAAAAhmcmVlAAAHS21kYXQAAAKuBgX//6rcRem95tlIt5Ys2CDZI+7veDI2NCAtIGNvcmUgMTY1IHIzMjIyIGIzNTYwNWEgLSBILjI2NC9NUEVHLTQgQVZDIGNvZGVjIC0gQ29weWxlZnQgMjAwMy0yMDI1IC0gaHR0cDovL3d3dy52aWRlb2xhbi5vcmcveDI2NC5odG1sIC0gb3B0aW9uczogY2FiYWM9MSByZWY9MyBkZWJsb2NrPTE6MDowIGFuYWx5c2U9MHgzOjB4MTEzIG1lPWhleCBzdWJtZT03IHBzeT0xIHBzeV9yZD0xLjAwOjAuMDAgbWl4ZWRfcmVmPTEgbWVfcmFuZ2U9MTYgY2hyb21hX21lPTEgdHJlbGxpcz0xIDh4OGRjdD0xIGNxbT0wIGRlYWR6b25lPTIxLDExIGZhc3RfcHNraXA9MSBjaHJvbWFfcXBfb2Zmc2V0PS0yIHRocmVhZHM9NiBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTMgYl9weXJhbWlkPTIgYl9hZGFwdD0xIGJfYmlhcz0wIGRpcmVjdD0xIHdlaWdodGI9MSBvcGVuX2dvcD0wIHdlaWdodHA9MiBrZXlpbnQ9MjUwIGtleWludF9taW49MjQgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD00MCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIzLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAIAAAAA2ZYiEADv//uOr+BTYmWRyyPlv/RjT88Ul2zyEzccsFUPz6rlbvBltktL8gDIAAXkH+1zT0gMXAAAADEGaJGxDv/6plgAiYAAAAAlBnkJ4hf8AKSEAAAAJAZ5hdEK/ADegAAAACQGeY2pCvwA3oQAAABJBmmhJqEFomUwId//+qZYAImEAAAALQZ6GRREsL/8AKSEAAAAJAZ6ldEK/ADehAAAACQGep2pCvwA3oAAAABJBmqxJqEFsmUwId//+qZYAImAAAAALQZ7KRRUsL/8AKSEAAAAJAZ7pdEK/ADegAAAACQGe62pCvwA3oAAAABJBmvBJqEFsmUwId//+qZYAImEAAAALQZ8ORRUsL/8AKSEAAAAJAZ8tdEK/ADehAAAACQGfL2pCvwA3oAAAABJBmzRJqEFsmUwId//+qZYAImAAAAALQZ9SRRUsL/8AKSEAAAAJAZ9xdEK/ADegAAAACQGfc2pCvwA3oAAAABJBm3hJqEFsmUwId//+qZYAImEAAAALQZ+WRRUsL/8AKSAAAAAJAZ+1dEK/ADehAAAACQGft2pCvwA3oQAAABJBm7xJqEFsmUwId//+qZYAImAAAAALQZ/aRRUsL/8AKSEAAAAJAZ/5dEK/ADegAAAACQGf+2pCvwA3oQAAABJBm+BJqEFsmUwId//+qZYAImEAAAALQZ4eRRUsL/8AKSAAAAAJAZ49dEK/ADegAAAACQGeP2pCvwA3oQAAABJBmiRJqEFsmUwId//+qZYAImAAAAALQZ5CRRUsL/8AKSEAAAAJAZ5hdEK/ADegAAAACQGeY2pCvwA3oQAAABJBmmhJqEFsmUwId//+qZYAImEAAAALQZ6GRRUsL/8AKSEAAAAJAZ6ldEK/ADehAAAACQGep2pCvwA3oAAAABJBmqxJqEFsmUwId//+qZYAImAAAAALQZ7KRRUsL/8AKSEAAAAJAZ7pdEK/ADegAAAACQGe62pCvwA3oAAAABJBmvBJqEFsmUwId//+qZYAImEAAAALQZ8ORRUsL/8AKSEAAAAJAZ8tdEK/ADehAAAACQGfL2pCvwA3oAAAABJBmzRJqEFsmUwId//+qZYAImAAAAALQZ9SRRUsL/8AKSEAAAAJAZ9xdEK/ADegAAAACQGfc2pCvwA3oAAAABJBm3hJqEFsmUwId//+qZYAImEAAAALQZ+WRRUsL/8AKSAAAAAJAZ+1dEK/ADehAAAACQGft2pCvwA3oQAAABJBm7xJqEFsmUwId//+qZYAImAAAAALQZ/aRRUsL/8AKSEAAAAJAZ/5dEK/ADegAAAACQGf+2pCvwA3oQAAABJBm+BJqEFsmUwIb//+p4QAQ8EAAAALQZ4eRRUsL/8AKSAAAAAJAZ49dEK/ADegAAAACQGeP2pCvwA3oQAAABFBmiRJqEFsmUwIZ//+nhABBwAAAAtBnkJFFSwv/wApIQAAAAkBnmF0Qr8AN6AAAAAJAZ5jakK/ADehAAAAEUGaZ0moQWyZTAhX//44QAP9AAAAC0GehUUVLCv/ADehAAAACQGepmpCvwA3oQ==', 'base64')
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

async function openMockedDraft(page: Page) {
  const writes: Write[] = []
  let post = {
    id: '00000000-0000-0000-0000-000000000930', studioContentId: null, platform: 'instagram',
    article_title: 'PhysioBaur · carrousel mixte', article_url: 'https://www.antoinequarroz.ch/',
    content: 'Un site pensé pour les patients de PhysioBaur. Parlons de votre projet.',
    status: 'draft', version: 1, publication_mode: 'manual', approved_version: null,
    media_kind: null, media_url: null, media_title: null, publish_after: null,
    media_images: [], media_items: media.map(item => ({ ...item })),
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

  // Only the browser's auth SDK receives this synthetic session. Every admin
  // request is intercepted above, so the test needs no live account or token.
  await page.goto('/admin/login')
  await expect(page.getByLabel(/mot de passe/i)).toBeVisible()
  const supabaseUrl = await page.evaluate(() => String((window as any).__NUXT__.config.public.supabaseUrl))
  expect(supabaseUrl).toMatch(/^https?:\/\//)
  const now = Math.floor(Date.now() / 1000)
  const user = { id: '00000000-0000-0000-0000-000000000030', email: 'ant30@example.invalid', aud: 'authenticated', role: 'authenticated', factors: [], app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() }
  const jwt = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', aal: 'aal2', exp: now + 3600, iat: now })).toString('base64url'),
    Buffer.from('synthetic-browser-only-signature').toString('base64url'),
  ].join('.')
  await page.route(`${new URL(supabaseUrl).origin}/auth/v1/**`, route => route.fulfill({ json: user }))
  await page.evaluate(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
    key: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`,
    session: { access_token: jwt, refresh_token: 'synthetic-browser-only-refresh', expires_at: now + 3600, expires_in: 3600, token_type: 'bearer', user },
  })
  await page.goto('/admin/social')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: post.article_title, exact: true }) })
  await expect(card.getByRole('heading', { name: 'Carrousel · 4 images et 2 vidéos', exact: true })).toBeVisible()
  return { card, writes }
}

test('mixed Instagram draft previews all six ordered media on mobile and waits for publication consent', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  const { card, writes } = await openMockedDraft(page)
  await expect(card.getByRole('img')).toHaveCount(4)
  await expect(card.locator('video')).toHaveCount(2)
  expect(await card.locator('figure').evaluateAll(figures => figures.map(figure => figure.querySelector('video, img')?.getAttribute('src')))).toEqual(media.map(item => item.url))
  for (const video of await card.locator('video').all()) {
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
  const dialog = page.getByRole('dialog')
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
  await expect(card.getByRole('button', { name: 'Valider pour 18 h', exact: true })).toBeDisabled()
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
