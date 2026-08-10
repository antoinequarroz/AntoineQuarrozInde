import { expect, test } from '@playwright/test'

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

test('admin can operate the payment cockpit on desktop and mobile', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
  await page.route('**/api/admin/payment-operations**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(paymentOperations) }))
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)

  await page.goto('/admin/payments')

  await expect(page.getByRole('heading', { name: 'Encaissements' })).toBeVisible()
  await expect(page.getByLabel('Synthèse des encaissements')).toContainText(/108[.,]10\s*CHF/)
  await expect(page.getByRole('heading', { name: 'À surveiller' })).toBeVisible()
  await expect(page.getByText('Facture FAC-2026-0012 en retard')).toBeVisible()
  await expect(page.getByText('Prioritaire')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Contrôler' }).first()).toHaveAttribute('href', '/admin/invoices?invoiceId=12')
  await expect(page.getByRole('table', { name: /journal chronologique/i })).toBeVisible()

  if (process.env.VISUAL_CAPTURE) {
    await page.screenshot({ path: testInfo.outputPath('aq049-desktop.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: testInfo.outputPath('aq049-mobile-viewport.png') })
    await page.screenshot({ path: testInfo.outputPath('aq049-mobile.png'), fullPage: true })
  }

  await page.getByLabel('Rechercher dans le journal').fill('introuvable')
  await expect(page.getByText('Aucun mouvement pour ce filtre')).toBeVisible()
  await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click()

  await page.unroute('**/api/admin/payment-operations**')
  await page.route('**/api/admin/payment-operations**', route => route.fulfill({ json: { ...paymentOperations, metrics: { ...paymentOperations.metrics, collectedCents: 0, collectedThisMonthCents: 0, outstandingCents: 0, overdueCents: 0, activeSessions: 0, attentionCount: 0 }, alerts: [], entries: [] } }))
  await page.reload()
  await expect(page.getByText('Aucun mouvement enregistré')).toBeVisible()

  await page.unroute('**/api/admin/payment-operations**')
  await page.route('**/api/admin/payment-operations**', route => route.fulfill({ status: 503, json: { message: 'sensitive backend detail' } }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Le journal des encaissements ne peut pas être chargé')
  await expect(page.getByRole('alert')).not.toContainText('sensitive backend detail')
})
