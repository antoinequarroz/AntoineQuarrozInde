import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

const paymentOperations = {
  generatedAt: '2026-08-10T18:00:00.000Z',
  metrics: {
    collectedCents: 24_810,
    collectedThisMonthCents: 10_810,
    outstandingCents: 32_400,
    overdueCents: 8_500,
    activeSessions: 1,
    attentionCount: 2,
  },
  alerts: [
    { id: 'overdue-12', kind: 'overdue_invoice', tone: 'critical', title: 'Facture FAC-2026-0012 en retard', detail: 'Studio pilote', amountCents: 8_500, currency: 'CHF', invoiceId: 12 },
    { id: 'stale-session-9', kind: 'stale_checkout', tone: 'warning', title: 'Session TWINT à contrôler · FAC-2026-0014', detail: 'Client démo', amountCents: 10_810, currency: 'CHF', invoiceId: 14 },
  ],
  entries: [
    { id: 'checkout-10', kind: 'checkout', status: 'open', occurredAt: '2026-08-10T17:30:00.000Z', paidAt: null, invoiceId: 14, invoiceNumber: 'FAC-2026-0014', clientName: 'Client démo', amountCents: 10_810, currency: 'CHF', method: 'twint', provider: 'stripe', reference: 'cs_test_open', note: 'Checkout ouvert, paiement non confirmé' },
    { id: 'payment-8', kind: 'payment', status: 'confirmed', occurredAt: '2026-08-10T12:00:00.000Z', paidAt: '2026-08-10', invoiceId: 11, invoiceNumber: 'FAC-2026-0011', clientName: 'Atelier numérique', amountCents: 14_000, currency: 'CHF', method: 'bank_transfer', provider: null, reference: 'RF240810', note: null },
    { id: 'checkout-9', kind: 'checkout', status: 'expired', occurredAt: '2026-08-09T10:00:00.000Z', paidAt: null, invoiceId: 14, invoiceNumber: 'FAC-2026-0014', clientName: 'Client démo', amountCents: 10_810, currency: 'CHF', method: 'twint', provider: 'stripe', reference: 'cs_test_expired', note: 'Session expirée sans encaissement' },
  ],
}

const reconciliationInvoices = [
  { id: 11, number: 'FAC-2026-0011', clientName: 'Atelier numérique', balanceCents: 14_050, currency: 'CHF', paymentReference: 'RF18 5390 0754 7034' },
  { id: 12, number: 'FAC-2026-0012', clientName: 'Studio pilote', balanceCents: 8_500, currency: 'CHF', paymentReference: '21 00000 00003 13947 14300 09017' },
]

test('admin can operate, reconcile and export the payment cockpit on desktop and mobile', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
  await page.route('**/api/admin/payment-operations**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(paymentOperations) }))
  const reconciledBodies: any[] = []
  await page.route('**/api/admin/payment-reconciliation', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { invoices: reconciliationInvoices } })
    const body = route.request().postDataJSON()
    reconciledBodies.push(body)
    if (body.transaction.transactionId === 'DUP-001') return route.fulfill({ status: 409, json: { message: 'Ce mouvement bancaire a déjà été rapproché.' } })
    return route.fulfill({ json: { payment: { id: 101 }, paidAmountCents: body.transaction.amountCents, status: 'paid' } })
  })
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)

  await page.goto('/admin/payments')

  await expect(page.getByRole('heading', { name: 'Encaissements' })).toBeVisible()
  await expect(page.getByLabel('Synthèse des encaissements')).toContainText(/108[.,]10\s*CHF/, { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: 'À surveiller' })).toBeVisible()
  await expect(page.getByText('Facture FAC-2026-0012 en retard')).toBeVisible()
  await expect(page.getByText('Prioritaire')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Contrôler' }).first()).toHaveAttribute('href', '/admin/invoices?invoiceId=12')
  await expect(page.getByRole('table', { name: /journal chronologique/i })).toBeVisible()

  await page.getByRole('button', { name: 'Rapprocher un relevé' }).click()
  await expect(page.getByRole('heading', { name: 'Rapprocher un relevé bancaire' })).toBeVisible()
  await page.getByLabel('Importer un relevé bancaire').setInputFiles({
    name: 'releve-aout.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([
      'Date;Crédit;Devise;Référence;Libellé;Transaction ID',
      '10.08.2026;140,50;CHF;RF18 5390 0754 7034;Règlement facture;TX-001',
      '11.08.2026;10,00;CHF;;Acompte libre;TX-002',
      '12.08.2026;85,00;CHF;21 00000 00003 13947 14300 09017;Déjà importé;DUP-001',
    ].join('\r\n')),
  })
  await expect(page.getByText('3 entrée(s) reconnue(s)')).toBeVisible()
  await expect(page.getByText('Référence de paiement exacte').first()).toBeVisible()

  const exactRow = page.getByRole('row').filter({ hasText: 'RF18 5390 0754 7034' })
  await exactRow.getByRole('button', { name: 'Confirmer' }).click()
  await expect(exactRow.getByText('Encaissement enregistré')).toBeVisible()

  const duplicateRow = page.getByRole('row').filter({ hasText: '21 00000 00003 13947 14300 09017' })
  await duplicateRow.getByRole('button', { name: 'Confirmer' }).click()
  await expect(duplicateRow.getByText('Déjà rapproché')).toBeVisible()

  const manualRow = page.getByRole('row').filter({ hasText: 'Acompte libre' })
  await manualRow.getByRole('combobox').selectOption('12')
  await manualRow.getByRole('button', { name: 'Confirmer' }).click()
  await expect(manualRow.getByText('Encaissement enregistré')).toBeVisible()
  expect(reconciledBodies).toHaveLength(3)
  expect(reconciledBodies[2]).toMatchObject({ invoiceId: 12, transaction: { amountCents: 1_000, transactionId: 'TX-002' } })

  if (process.env.VISUAL_CAPTURE) {
    await page.waitForTimeout(4_000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: testInfo.outputPath('aq051-desktop-viewport.png') })
    await page.screenshot({ path: testInfo.outputPath('aq051-desktop.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(400)
    await page.screenshot({ path: testInfo.outputPath('aq051-mobile-viewport.png') })
    await page.screenshot({ path: testInfo.outputPath('aq051-mobile.png'), fullPage: true })
  }

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Exporter 3 mouvements au format CSV/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^journal-encaissements-\d{4}-\d{2}-\d{2}\.csv$/)
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()
  const exportedCsv = await readFile(downloadPath!, 'utf8')
  expect(exportedCsv).toContain('"Encaissement";"Confirmé";"FAC-2026-0011"')
  expect(exportedCsv).toContain('"Session de paiement";"Expiré";"FAC-2026-0014"')

  await page.getByLabel('Rechercher dans le journal').fill('introuvable')
  await expect(page.getByText('Aucun mouvement pour ce filtre')).toBeVisible()
  await expect(page.getByRole('button', { name: /Exporter 0 mouvement au format CSV/ })).toBeDisabled()
  await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click()

  await page.unroute('**/api/admin/payment-operations**')
  await page.route('**/api/admin/payment-operations**', route => route.fulfill({ json: { ...paymentOperations, metrics: { ...paymentOperations.metrics, collectedCents: 0, collectedThisMonthCents: 0, outstandingCents: 0, overdueCents: 0, activeSessions: 0, attentionCount: 0 }, alerts: [], entries: [] } }))
  await page.reload()
  await expect(page.getByText('Aucun mouvement enregistré')).toBeVisible({ timeout: 60_000 })

  await page.unroute('**/api/admin/payment-operations**')
  await page.route('**/api/admin/payment-operations**', route => route.fulfill({ status: 503, json: { message: 'sensitive backend detail' } }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Le journal des encaissements ne peut pas être chargé', { timeout: 60_000 })
  await expect(page.getByRole('alert')).not.toContainText('sensitive backend detail')

  await page.unroute('**/api/admin/payment-reconciliation')
})
