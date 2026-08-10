import { expect, test } from '@playwright/test'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test('admin invites, suspends and restores a client portal access', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')

  let portalState: 'not_invited' | 'invited' | 'active' | 'disabled' = 'not_invited'
  const client = () => ({
    id: 7,
    name: 'Camille Exemple',
    company: 'Atelier Exemple',
    email: 'camille@example.com',
    phone: '+41 79 000 00 00',
    status: 'active',
    notes: null,
    billingStreet: null,
    billingBuilding: null,
    billingPostalCode: null,
    billingCity: null,
    billingCountry: 'CH',
    acquisitionSource: 'Recommandation',
    acquisitionMedium: 'Bouche à oreille',
    acquisitionCampaign: null,
    portalUserId: portalState === 'not_invited' ? null : '11111111-1111-1111-1111-111111111111',
    portalInvitedAt: portalState === 'not_invited' ? null : '2026-08-10T12:00:00Z',
    portalActivatedAt: portalState === 'active' || portalState === 'disabled' ? '2026-08-10T12:10:00Z' : null,
    portalAccessDisabledAt: portalState === 'disabled' ? '2026-08-10T13:00:00Z' : null,
    createdAt: '2026-08-01',
  })

  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)

  await page.route('**/api/admin/clients/views**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/clients**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [client()], total: 1, page: 1, pageSize: 20 }),
  }))
  await page.route('**/api/admin/clients/access', async (route) => {
    const body = route.request().postDataJSON() as { action: string }
    if (body.action === 'invite' || body.action === 'resend') portalState = 'invited'
    if (body.action === 'disable') portalState = 'disabled'
    if (body.action === 'enable') portalState = 'active'
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: portalState, email: client().email, client: client() }) })
  })

  await page.goto('/admin/clients')
  await expect(page.getByRole('table').getByText('Camille Exemple', { exact: true })).toBeVisible()
  await expect(page.getByRole('table').getByText('Non invité', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Accès', exact: true }).click()
  let accessDialog = page.getByRole('dialog')
  await expect(accessDialog.getByRole('heading', { name: 'Accès client de Camille Exemple' })).toBeVisible()
  await page.getByRole('button', { name: 'Envoyer l’invitation' }).click()
  await expect(accessDialog.getByText('Invitation envoyée', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('client-access-desktop.png'), fullPage: true })

  portalState = 'active'
  await page.reload()
  await page.getByRole('button', { name: 'Accès', exact: true }).click()
  accessDialog = page.getByRole('dialog')
  await page.getByRole('button', { name: 'Suspendre', exact: true }).click()
  await expect(accessDialog.getByText('Accès suspendu', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Réactiver', exact: true }).click()
  await expect(accessDialog.getByText('Accès actif', { exact: true })).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('button', { name: 'Gérer l’accès', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Accès client de Camille Exemple' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('client-access-mobile.png'), fullPage: true })
})

test('portal login exposes a non-enumerating password recovery path', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/portal/login')
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__))
  await page.getByLabel('E-mail').fill('')
  await expect(page.getByRole('button', { name: 'Mot de passe oublié ?' })).toBeVisible()
  await page.getByRole('button', { name: 'Mot de passe oublié ?' }).click()
  await expect(page.getByRole('alert')).toHaveText('Saisissez d’abord votre adresse e-mail.')
})
