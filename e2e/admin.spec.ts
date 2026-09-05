import { expect, test } from '@playwright/test'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

async function selectSandboxOrganization(page: import('@playwright/test').Page) {
  const organizationSelect = page.getByRole('combobox', { name: 'Organisation active' })
  if (!await organizationSelect.isVisible()) return
  const sandboxOption = organizationSelect.locator('option', { hasText: 'AQ E2E Sandbox' })
  if (!await sandboxOption.count()) return
  const sandboxId = await sandboxOption.first().getAttribute('value') || ''
  if (await organizationSelect.inputValue() !== sandboxId) {
    await Promise.all([
      page.waitForNavigation(),
      organizationSelect.selectOption(sandboxId),
    ])
  }
  await expect(organizationSelect).toHaveValue(sandboxId)
  await page.reload()
  await expect(organizationSelect).toHaveValue(sandboxId)
}

test('authenticated admin can reach CRM, quotes and invoices', async ({ page }) => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)
  await selectSandboxOrganization(page)

  await page.goto('/admin/crm')
  await expect(page.getByRole('heading', { name: /carnet d.adresses/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pipeline' })).toBeVisible()

  await page.goto('/admin/quotes')
  await expect(page.getByRole('heading', { name: 'Devis', exact: true })).toBeVisible()
  await page.goto('/admin/invoices')
  await expect(page.getByRole('heading', { name: 'Factures', exact: true })).toBeVisible()

  await page.goto('/admin/clients')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('button', { name: 'Nouveau' })).toBeVisible()
  await page.getByRole('button', { name: 'Nouveau' }).click()
  await expect(page.getByRole('group', { name: 'Acquisition' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Source' })).toBeVisible()
  await page.getByRole('button', { name: 'Annuler' }).click()

  await page.goto('/admin/projects')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Nouveau' }).click()
  await expect(page.getByRole('group', { name: 'Publication' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Afficher dans le portfolio/ })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: /Publier l’étude de cas/ })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: /Mettre en avant/ })).toBeEnabled()
  await page.getByRole('button', { name: 'Annuler' }).click()

  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Relances clients' })).toBeVisible()
  await expect(page.getByText(/vérifie chaque destinataire/i)).toBeVisible()
})

test('admin dashboard preferences, help and diagnostics remain usable', async ({ page }) => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)
  await selectSandboxOrganization(page)
  await expect(page.getByText(/Données à jour/)).toBeVisible()

  await page.getByRole('button', { name: 'État détaillé' }).click()
  const diagnostics = page.getByRole('dialog', { name: 'État des données' })
  await expect(diagnostics).toBeVisible()
  await expect(diagnostics.getByText(/8 source\(s\) sur 8/)).toBeVisible()
  await diagnostics.getByRole('button', { name: /Fermer l’état/ }).click()

  await page.getByRole('button', { name: 'Personnaliser' }).click()
  const settings = page.getByRole('dialog', { name: 'Personnaliser le tableau de bord' })
  const activityToggle = settings.getByRole('checkbox', { name: /Commerce et production/ })
  await activityToggle.uncheck()
  await settings.getByRole('button', { name: 'Terminer' }).click()
  await expect(page.getByRole('heading', { name: 'Décisions commerciales' })).toBeHidden()
  await page.reload()
  await expect(page.getByText(/Données à jour/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Décisions commerciales' })).toBeHidden()
  await page.getByRole('button', { name: 'Personnaliser' }).click()
  await page.getByRole('dialog', { name: 'Personnaliser le tableau de bord' }).getByRole('button', { name: 'Réinitialiser' }).click()
  await page.getByRole('dialog', { name: 'Personnaliser le tableau de bord' }).getByRole('button', { name: 'Terminer' }).click()
  await expect(page.getByRole('heading', { name: 'Décisions commerciales' })).toBeVisible()

  await page.getByRole('button', { name: 'Aide et raccourcis' }).click()
  const help = page.getByRole('dialog', { name: 'Aide et prise en main' })
  await expect(help.getByRole('heading', { name: 'Démarrage rapide' })).toBeVisible()
  await expect(help.getByText('G puis T')).toBeVisible()
  await help.getByRole('button', { name: /Fermer l’aide/ }).click()

  await page.keyboard.press('g')
  await page.keyboard.press('t')
  await expect(page).toHaveURL(/\/admin\/tasks/)
  await page.keyboard.press('n')
  await page.keyboard.press('t')
  await expect(page.getByRole('dialog', { name: 'Nouvelle tâche' })).toBeVisible()
})

test('admin dashboard remains actionable and responsive on mobile', async ({ page }) => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
  const pageErrors: string[] = []
  const hydrationWarnings: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (/hydration.*mismatch/i.test(message.text())) hydrationWarnings.push(message.text())
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)

  await selectSandboxOrganization(page)

  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ouvrir la recherche globale' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Nouvelle tâche/ })).toBeVisible()
  await expect(page.getByText(/Données à jour/)).toBeVisible()
  await expect(page.locator('#admin-navigation')).toHaveAttribute('inert', '')

  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  const mobileNavigation = page.getByRole('dialog', { name: 'Espace de gestion' })
  await expect(mobileNavigation).toBeVisible()
  await expect(mobileNavigation.getByRole('link', { name: 'Factures' })).toBeVisible()
  await mobileNavigation.press('Escape')
  await expect(mobileNavigation).toBeHidden()

  await page.getByRole('button', { name: 'Ouvrir la recherche globale' }).click()
  const searchDialog = page.getByRole('dialog', { name: 'Recherche globale' })
  await expect(searchDialog.getByRole('searchbox')).toBeFocused()
  await searchDialog.press('Escape')
  await expect(searchDialog).toBeHidden()

  await page.getByRole('button', { name: 'État détaillé' }).click()
  const diagnostics = page.getByRole('dialog', { name: 'État des données' })
  await expect(diagnostics).toBeVisible()
  await expect(diagnostics.getByRole('button', { name: 'Tout actualiser' })).toBeVisible()
  await diagnostics.press('Escape')

  await page.getByRole('button', { name: 'Personnaliser' }).click()
  const settings = page.getByRole('dialog', { name: 'Personnaliser le tableau de bord' })
  await expect(settings.getByRole('button', { name: 'Terminer' })).toBeVisible()
  await settings.press('Escape')

  await page.getByRole('button', { name: 'Aide et raccourcis' }).click()
  const help = page.getByRole('dialog', { name: 'Aide et prise en main' })
  await expect(help.getByRole('heading', { name: 'Démarrage rapide' })).toBeVisible()
  const helpIsScrollable = await help.evaluate(element => element.scrollHeight > element.clientHeight)
  expect(helpIsScrollable).toBe(true)
  await help.press('Escape')

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(hasHorizontalOverflow).toBe(false)
  expect(pageErrors).toEqual([])
  expect(hydrationWarnings).toEqual([])
})

test('admin operational forms remain usable on mobile', async ({ page }) => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)
  await selectSandboxOrganization(page)

  await page.goto('/admin/accounting')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Comptabilité' })).toBeVisible()
  await expect(page.getByLabel('Montant HT (CHF)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Actualiser' })).toBeEnabled()

  await page.goto('/admin/projects')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Nouveau' }).click()
  const projectDialog = page.getByRole('dialog', { name: 'Nouveau projet' })
  await expect(projectDialog).toBeVisible()
  await expect(projectDialog.getByRole('textbox', { name: 'Titre *', exact: true })).toBeVisible()
  await expect(projectDialog.getByRole('button', { name: 'Créer' })).toBeVisible()
  await projectDialog.getByRole('button', { name: 'Annuler' }).click()

  await page.goto('/admin/clients')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Nouveau client' }).click()
  const clientDialog = page.getByRole('dialog', { name: 'Nouveau client' })
  await expect(clientDialog.getByLabel('Nom')).toBeVisible()
  await expect(clientDialog.getByLabel('E-mail')).toBeVisible()
  await expect(clientDialog.getByRole('button', { name: 'Enregistrer' })).toBeVisible()
  await clientDialog.getByRole('button', { name: 'Annuler' }).click()

  await page.goto('/admin/invoices')
  await page.waitForLoadState('networkidle')
  const firstInvoice = page.locator('article').filter({ hasText: /Facture|Avoir/ }).first()
  if (await firstInvoice.count()) {
    const pdfAction = firstInvoice.getByRole('button', { name: 'Voir le PDF' })
    if (!await pdfAction.isVisible()) await firstInvoice.locator('button').first().click()
    await expect(pdfAction).toBeVisible()
    await expect(firstInvoice.getByRole('button', { name: 'Télécharger' })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Nouvelle facture' }).click()
  const invoiceDialog = page.getByRole('dialog', { name: 'Nouvelle facture' })
  await expect(invoiceDialog.getByLabel('Numéro')).toBeVisible()
  await expect(invoiceDialog.getByLabel(/Prix unitaire/)).toBeVisible()
  await expect(invoiceDialog.getByRole('button', { name: 'Enregistrer et prévisualiser' })).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(hasHorizontalOverflow).toBe(false)
  expect(pageErrors).toEqual([])
})

test('secondary admin pages remain complete and responsive on mobile', async ({ page }) => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
  test.setTimeout(120_000)

  const pageErrors: string[] = []
  const hydrationWarnings: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (/hydration.*mismatch/i.test(message.text())) hydrationWarnings.push(message.text())
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)
  await selectSandboxOrganization(page)

  const routes = [
    ['/admin/crm', 'Carnet d’adresses & prospection'],
    ['/admin/tasks', 'Tâches'],
    ['/admin/quotes', 'Devis'],
    ['/admin/appointments', 'Agenda'],
    ['/admin/articles', 'Articles'],
    ['/admin/reviews', 'Avis clients'],
    ['/admin/messages', 'Messages CRM'],
    ['/admin/analytics', 'Performance commerciale'],
    ['/admin/payments', 'Encaissements'],
    ['/admin/audit', 'Maintenance audit'],
    ['/admin/errors', 'Erreurs applicatives'],
  ] as const

  for (const [route, heading] of routes) {
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible()
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasHorizontalOverflow, `${route} must not overflow horizontally`).toBe(false)
  }

  const forms = [
    ['/admin/tasks', 'Nouvelle tâche', 'Nouvelle tâche'],
    ['/admin/quotes', 'Nouveau devis', 'Nouveau devis'],
    ['/admin/appointments', 'Nouveau rendez-vous', 'Nouveau rendez-vous'],
    ['/admin/articles', 'Nouvel article', 'Nouvel article'],
    ['/admin/reviews', 'Ajouter', 'Ajouter un avis'],
  ] as const

  for (const [route, trigger, dialogName] of forms) {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: trigger, exact: true }).first().click()
    const dialog = page.getByRole('dialog', { name: dialogName, exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('input, textarea, select').first()).toBeVisible()
    const dialogFitsViewport = await dialog.evaluate(element => element.scrollWidth <= window.innerWidth + 1)
    expect(dialogFitsViewport, `${dialogName} must fit the mobile viewport`).toBe(true)
    const closeButton = dialog.getByRole('button', { name: /Annuler|Fermer/ }).last()
    await closeButton.click()
    await expect(dialog).toBeHidden()
  }

  expect(pageErrors).toEqual([])
  expect(hydrationWarnings).toEqual([])
})
