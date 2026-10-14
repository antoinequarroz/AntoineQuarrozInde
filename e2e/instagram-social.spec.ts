import { expect, test } from '@playwright/test'
import { adminCredentialsConfigured, loginAdmin } from './helpers/admin-auth'

test('Instagram observations and draft review stay separate from automatic publication', async ({ page }) => {
  test.setTimeout(120_000)
  test.skip(!adminCredentialsConfigured, 'E2E administrator credentials are required')
  const time = new Date().toISOString()
  await page.route('**/api/admin/social-insights', route => route.fulfill({ json: {
    receivedAt: time, instagram: { schemaVersion: 1, expectedUsername: 'antoinequarroz.dev', state: 'connected', readOnly: true, publishingEnabled: false,
      collectedAt: time, lastSuccessfulAt: time, period: { from: '2026-09-30T00:00:00+02:00', to: '2026-10-14T00:00:00+02:00' },
      profile: { id: '17841434338571820', username: 'antoinequarroz.dev', followers: 255, mediaCount: 1 },
      metrics: { reach: 1333, accounts_engaged: null, total_interactions: 0 }, media: [], errors: [], chargedMicroUSD: 0 },
  } }))
  await page.route('**/api/admin/social-site-stats', route => route.fulfill({ json: {
    available: true, configured: true, measuredAt: time, periodDays: 30,
    rows: [{ platform: 'instagram', visitors: 4, pageviews: 9 }, { platform: 'linkedin', visitors: 12, pageviews: 18 }, { platform: 'x', visitors: 0, pageviews: 0 }],
  } }))
  const post = { id: '00000000-0000-0000-0000-000000000899', studioContentId: '12345678-0000-0000-0000-000000000001',
    platform: 'instagram', article_title: 'Pilote Instagram', article_url: 'https://www.antoinequarroz.ch/',
    content: 'Texte de démonstration à relire.', status: 'draft', version: 1, media_kind: null, media_url: null, publish_after: null }
  await page.route('**/api/admin/social-posts', route => route.fulfill({ json: { posts: [post], connections: [] } }))
  const reviewed: any[] = []
  await page.route('**/api/admin/social-posts/*/review-instagram', route => {
    reviewed.push(route.request().postDataJSON())
    return route.fulfill({ json: { id: post.id, content: post.content, status: 'approved', version: 2, publish_after: null } })
  })
  const unexpected: string[] = []
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/approve')) unexpected.push(request.url()) })
  await loginAdmin(page)
  await page.goto('/admin/social')
  await expect(page.getByRole('heading', { name: 'Audience et visites vers le site' })).toBeVisible()
  await expect(page.getByText('Connecté · lecture seule', { exact: true })).toBeVisible()
  const draft = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Pilote Instagram', exact: true }) })
  await expect(draft.getByRole('button', { name: 'Valider pour 18 h' })).toHaveCount(0)
  await expect(draft.getByRole('button', { name: 'Publier maintenant' })).toHaveCount(0)
  await draft.getByRole('button', { name: 'Valider le texte', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Valider le texte', exact: true })).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Valider le texte', exact: true }).click()
  await expect(page.getByText('Texte validé · à publier manuellement avec sa vidéo depuis le studio.', { exact: true })).toBeVisible()
  expect(reviewed).toHaveLength(1)
  expect(reviewed[0].confirmation).toBe('VALIDER_TEXTE_INSTAGRAM')
  expect(unexpected).toEqual([])
  await page.goto('/admin/analytics')
  await expect(page.getByRole('heading', { name: 'Statistiques natives LinkedIn et X' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Audience et visites vers le site' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
