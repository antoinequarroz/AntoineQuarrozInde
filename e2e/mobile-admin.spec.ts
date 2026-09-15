import { expect, test, type Page } from '@playwright/test'
import { generateTotpCode, loginAdmin, requireAdminCredentials } from './helpers/admin-auth'
import { activateWithKeyboard, expectDialogFitsViewport, expectNoHorizontalOverflow, expectTouchTarget } from './helpers/mobile-admin'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })

const emptyPayments = {
  generatedAt: '2026-09-15T00:00:00.000Z',
  metrics: { collectedCents: 0, collectedThisMonthCents: 0, outstandingCents: 0, overdueCents: 0, activeSessions: 0, attentionCount: 0 },
  alerts: [],
  entries: [],
}

async function selectSandboxOrganization(page: Page) {
  const organizationSelect = page.getByRole('combobox', { name: 'Organisation active' })
  const option = organizationSelect.locator('option', { hasText: 'AQ E2E Sandbox' })
  const sandboxId = await option.first().getAttribute('value')
  expect(sandboxId, 'AQ E2E Sandbox must exist').toBeTruthy()
  if (await organizationSelect.inputValue() !== sandboxId) {
    await Promise.all([page.waitForNavigation(), organizationSelect.selectOption(sandboxId!)])
  }
}

test.beforeEach(() => {
  requireAdminCredentials()
})

test('mobile admin signs in through MFA and keeps the protected redirect', async ({ page }) => {
  const { email, password, totpSecret } = requireAdminCredentials()
  expect(totpSecret, 'E2E_ADMIN_TOTP_SECRET is required for the mobile MFA gate').toBeTruthy()

  await page.goto('/admin/login?redirect=/admin/clients')
  await expectNoHorizontalOverflow(page)
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/mot de passe/i).fill(password)
  const submit = page.getByRole('button', { name: /se connecter/i })
  await expectTouchTarget(submit)
  await submit.tap()

  await expect(page).toHaveURL(/\/admin\/security/)
  const code = page.getByLabel('Code à six chiffres')
  await expect(code).toBeFocused()
  await code.fill(generateTotpCode(totpSecret!))
  await page.keyboard.press('Tab')
  const verify = page.getByRole('button', { name: 'Vérifier et continuer' })
  await expect(verify).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/admin\/clients(?:\?.*)?$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Clients' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('mobile MFA rejects an invalid code without exposing provider details', async ({ page }) => {
  const { email, password } = requireAdminCredentials()
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/mot de passe/i).fill(password)
  await page.getByRole('button', { name: /se connecter/i }).tap()
  await expect(page).toHaveURL(/\/admin\/security/)

  await page.route('**/auth/v1/factors/*/verify', route => route.fulfill({
    status: 422,
    json: { code: 'invalid_totp', message: 'private provider detail' },
  }))
  await page.getByLabel('Code à six chiffres').fill('000000')
  await page.getByRole('button', { name: 'Vérifier et continuer' }).tap()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Le code est invalide ou a expiré')
  await expect(alert).not.toContainText('private provider detail')
  await expect(page).toHaveURL(/\/admin\/security/)
  await expectNoHorizontalOverflow(page)
})

test('commercial navigation and dialogs work by touch and keyboard', async ({ page }) => {
  await loginAdmin(page)
  await selectSandboxOrganization(page)

  const journeys = [
    { path: '/admin/clients', trigger: 'Nouveau client', dialog: 'Nouveau client' },
    { path: '/admin/quotes', trigger: 'Nouveau devis', dialog: 'Nouveau devis' },
    { path: '/admin/invoices', trigger: 'Nouvelle facture', dialog: 'Nouvelle facture' },
  ] as const

  for (const journey of journeys) {
    await page.goto(journey.path)
    await page.waitForLoadState('networkidle')
    const trigger = page.getByRole('button', { name: journey.trigger, exact: true }).first()
    await expectTouchTarget(trigger)
    await activateWithKeyboard(page, trigger)
    const dialog = page.getByRole('dialog', { name: journey.dialog, exact: true })
    await expectDialogFitsViewport(page, dialog)
    const focusIsInside = await dialog.evaluate(element => element.contains(document.activeElement))
    expect(focusIsInside, `${journey.dialog} must receive focus when it opens`).toBe(true)
    await dialog.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expectNoHorizontalOverflow(page)
  }

  await page.goto('/admin/payments')
  await page.waitForLoadState('networkidle')
  const reconcile = page.getByRole('button', { name: 'Rapprocher un relevé' })
  await expectTouchTarget(reconcile)
  await reconcile.tap()
  await expect(page.getByRole('heading', { name: 'Rapprocher un relevé bancaire' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

const stateCases = [
  {
    name: 'clients', path: '/admin/clients', api: '**/api/clients**', loading: 'Chargement des clients',
    empty: { items: [], total: 0, page: 1, pageSize: 20 }, emptyText: 'Aucun client', errorText: 'Chargement impossible',
  },
  {
    name: 'quotes', path: '/admin/quotes', api: '**/api/quotes**', loading: 'Chargement des devis',
    empty: [], emptyText: 'Aucun devis', errorText: 'Les devis sont indisponibles',
  },
  {
    name: 'invoices', path: '/admin/invoices', api: '**/api/invoices**', loading: 'Chargement des factures',
    empty: [], emptyText: 'Aucune facture trouvée', errorText: 'Chargement impossible',
  },
  {
    name: 'payments', path: '/admin/payments', api: '**/api/admin/payment-operations**', loading: 'Chargement du journal des encaissements',
    empty: emptyPayments, emptyText: 'Aucun mouvement enregistré', errorText: 'Les données de paiement sont indisponibles',
  },
] as const

for (const stateCase of stateCases) {
  test(`${stateCase.name} exposes loading, empty and safe error states on mobile`, async ({ page }) => {
    await loginAdmin(page)
    await selectSandboxOrganization(page)
    let releaseResponse!: () => void
    const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve })
    await page.route(stateCase.api, async (route) => {
      await responseGate
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stateCase.empty) })
    })

    await page.goto(stateCase.path)
    try {
      await expect(page.getByText(stateCase.loading, { exact: true })).toBeVisible()
    }
    finally {
      releaseResponse()
    }
    await expect(page.getByText(stateCase.emptyText, { exact: false }).first()).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.unroute(stateCase.api)
    await page.route(stateCase.api, route => route.fulfill({ status: 503, json: { message: 'private backend detail' } }))
    await page.reload()
    const alert = page.getByRole('alert').filter({ hasText: stateCase.errorText }).first()
    await expect(alert).toBeVisible()
    await expect(alert).not.toContainText('private backend detail')
    await expectTouchTarget(alert.getByRole('button', { name: 'Réessayer' }))
    await expectNoHorizontalOverflow(page)
  })
}
