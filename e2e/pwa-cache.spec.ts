import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'allow', viewport: { width: 390, height: 844 } })

test('PWA installs a small shell and handles only public offline navigations', async ({ context, page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'La connexion est interrompue.' })).toHaveCount(0)

  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 30_000 })
  const precache = await page.evaluate(async () => {
    const names = (await caches.keys()).filter(name => name.includes('precache'))
    const entries = []
    for (const name of names) {
      const cache = await caches.open(name)
      for (const request of await cache.keys()) {
        const response = await cache.match(request)
        entries.push({ path: new URL(request.url).pathname, bytes: response ? (await response.arrayBuffer()).byteLength : 0 })
      }
    }
    return entries
  })
  expect(precache.some(entry => entry.path === '/offline.htm')).toBe(true)
  expect(precache.reduce((sum, entry) => sum + entry.bytes, 0)).toBeLessThan(512_000)
  expect(precache.filter(entry => /^\/(?:article-media|social|showcase-tools|case-studies|portfolio-previews|videos)\//.test(entry.path))).toEqual([])

  const cachedNavigations = await page.evaluate(async () => {
    const paths = []
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      for (const request of await cache.keys()) paths.push(new URL(request.url).pathname)
    }
    return paths.filter(path => path === '/' || /^\/(?:admin|portal|api)(?:\/|$)/.test(path))
  })
  expect(cachedNavigations).toEqual([])

  await context.setOffline(true)
  const response = await page.goto('/blog/offline-navigation-proof')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'La connexion est interrompue.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Revenir à l’accueil' })).toHaveAttribute('href', '/')

  for (const path of ['/admin/login', '/portal/login', '/api/health']) {
    await expect(page.goto(path), path).rejects.toThrow(/ERR_INTERNET_DISCONNECTED|ERR_FAILED/)
  }
  await context.setOffline(false)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'La connexion est interrompue.' })).toHaveCount(0)
})
