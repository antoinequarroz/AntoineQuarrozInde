import { expect, test } from '@playwright/test'
import { adminCredentialsConfigured, loginAdmin } from './helpers/admin-auth'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test('Instagram carousel approval includes saved images and uses automatic publication consent', async ({ page }) => {
  test.skip(!adminCredentialsConfigured, 'E2E administrator credentials are required')
  test.setTimeout(120_000)
  const post = { id: '00000000-0000-0000-0000-000000000909', studioContentId: null, platform: 'instagram',
    article_title: 'Carrousel Instagram à valider', article_url: 'https://www.antoinequarroz.ch/', content: 'Une légende Instagram sans lien cliquable.',
    status: 'draft', version: 1, publication_mode: 'manual', approved_version: null,
    media_kind: null, media_url: null, media_title: null, publish_after: null,
    media_images: [1, 2].map(i => ({ url: `https://www.antoinequarroz.ch/social/physiobaur/0${i}-PhysioBaur.jpg`, alt: `Visuel ${i}` })) }
  await page.route(/\/api\/admin\/social-posts(?:\?.*)?$/, route => route.fulfill({ json: { posts: [post], connections: [] } }))
  await page.route('**/api/admin/social-insights', route => route.fulfill({ json: { instagram: null, receivedAt: null } }))
  await page.route('**/api/admin/social-site-stats', route => route.fulfill({ json: { available: false, configured: false, rows: [] } }))
  const approvals: any[] = []
  await page.route('**/api/admin/social-posts/*/approve', route => {
    approvals.push(route.request().postDataJSON())
    return route.fulfill({ json: { ...post, status: 'approved', publication_mode: 'automatic', approved_version: 2, version: 2, publish_after: new Date().toISOString() } })
  })
  const manualReviews: string[] = []
  page.on('request', request => { if (request.method() === 'POST' && /\/review-(instagram|media)$/.test(new URL(request.url()).pathname)) manualReviews.push(request.url()) })
  await loginAdmin(page)
  await page.goto('/admin/social')
  await page.getByRole('button', { name: `Ouvrir ${post.article_title} sur Instagram`, exact: true }).click()
  const card = page.getByRole('dialog', { name: 'Publication Instagram', exact: true })
  await expect(card.getByRole('heading', { name: 'Carrousel · 2 images', exact: true })).toBeVisible()
  await expect(card.getByRole('button', { name: 'Valider le texte', exact: true })).toHaveCount(0)
  await card.getByRole('button', { name: 'Publier maintenant', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Publier maintenant', exact: true })
  await expect(dialog.getByRole('button', { name: 'Publier maintenant', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('img')).toHaveCount(2)
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Publier maintenant', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Modifier et annuler la validation', exact: true })).toBeVisible()
  expect(approvals).toEqual([expect.objectContaining({ mode: 'now', confirmation: 'PUBLIER_MAINTENANT', version: 1, content: post.content })])
  expect(manualReviews).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
