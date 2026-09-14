import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { adminCredentialsConfigured, loginAdmin } from './helpers/admin-auth'

async function getAccessToken(page: Page) {
  await loginAdmin(page)
  return page.evaluate(() => {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue
      const stored = localStorage.getItem(key)
      if (!stored) continue
      const session = JSON.parse(stored)
      if (typeof session?.access_token === 'string') return session.access_token
    }
    throw new Error('Supabase access token not found after login')
  })
}

async function selectSandboxOrganization(page: Page) {
  const organizationSelect = page.getByRole('combobox', { name: 'Organisation active' })
  const sandboxOption = organizationSelect.locator('option', { hasText: 'AQ E2E Sandbox' })
  const sandboxId = await sandboxOption.first().getAttribute('value') || ''
  if (await organizationSelect.inputValue() !== sandboxId) {
    await Promise.all([
      page.waitForNavigation(),
      organizationSelect.selectOption(sandboxId),
    ])
  }
  await page.reload()
  await expect(organizationSelect).toHaveValue(sandboxId)
}

async function expectAccessibleDetailPage(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  const blocking = results.violations.filter(violation => violation.impact === 'critical' || violation.impact === 'serious')
  expect(blocking, blocking.map(violation => `${violation.id}: ${violation.help}`).join('\n')).toEqual([])
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(hasHorizontalOverflow).toBe(false)
}

test('sandbox covers client to paid invoice and cleans up business data', async ({ page, request }) => {
  test.skip(!adminCredentialsConfigured, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')

  const accessToken = await getAccessToken(page)
  const baseHeaders = { authorization: `Bearer ${accessToken}` }
  const organizationsResponse = await request.get('/api/admin/organizations', { headers: baseHeaders })
  expect(organizationsResponse.ok()).toBeTruthy()
  const organizations = await organizationsResponse.json() as Array<{ id: string, slug: string }>
  const sandbox = organizations.find(organization => organization.slug === 'aq-e2e-sandbox')
  expect(sandbox, 'The isolated AQ E2E Sandbox organization must exist').toBeTruthy()
  const headers = { ...baseHeaders, 'x-organization-id': sandbox!.id }

  const runId = `${Date.now()}-${test.info().retry}`
  const ids: { client?: number, project?: number, quote?: number, invoice?: number, standaloneInvoice?: number } = {}
  const conversionInvoiceIds = new Set<number>()
  const item = { label: 'Audit E2E', description: 'Donnee temporaire automatiquement supprimee', quantity: 1, unitPriceCents: 12500, taxRate: 8.1 }

  try {
    const standaloneInvoiceResponse = await request.post('/api/invoices', {
      headers,
      data: {
        number: `E2E-EMPTY-${runId}`,
        currency: 'CHF',
        status: 'draft',
        issuedAt: new Date().toISOString().slice(0, 10),
        paymentReferenceType: 'NON',
        items: [{ label: 'Prestation', quantity: 1, unitPriceCents: 0, taxRate: 8.1 }],
      },
    })
    const standaloneInvoice = await standaloneInvoiceResponse.json()
    expect(
      standaloneInvoiceResponse.ok(),
      `Standalone invoice creation failed (${standaloneInvoiceResponse.status()}): ${standaloneInvoice?.message || 'unknown error'}`,
    ).toBeTruthy()
    ids.standaloneInvoice = standaloneInvoice.id

    const incompatibleQrrResponse = await request.post('/api/invoices', {
      headers,
      data: {
        number: `E2E-QRR-${runId}`,
        currency: 'CHF',
        status: 'draft',
        issuedAt: new Date().toISOString().slice(0, 10),
        paymentReferenceType: 'QRR',
        paymentReference: '210000000003139471430009017',
        items: [item],
      },
    })
    expect(incompatibleQrrResponse.status()).toBe(400)
    expect((await incompatibleQrrResponse.json()).message).toContain('QR-IBAN')

    const clientResponse = await request.post('/api/clients', {
      headers,
      data: {
        name: `Client E2E ${runId}`,
        company: 'AQ Sandbox',
        email: `e2e-${runId}@example.invalid`,
        status: 'lead',
        billingStreet: 'Rue du Test',
        billingBuilding: '1',
        billingPostalCode: '1950',
        billingCity: 'Sion',
        billingCountry: 'CH',
      },
    })
    expect(clientResponse.ok()).toBeTruthy()
    ids.client = (await clientResponse.json()).id

    const projectResponse = await request.post('/api/projects', {
      headers,
      data: {
        clientId: ids.client,
        title: `Projet E2E ${runId}`,
        slug: `e2e-${runId}`,
        category: 'web',
        description: 'Projet temporaire de validation du parcours metier.',
        descriptionEn: 'Temporary project used to validate the business workflow.',
        descriptionDe: 'Temporäres Projekt zur Validierung des Geschäftsablaufs.',
        image: 'https://example.invalid/e2e-project.png',
        liveUrl: 'https://example.invalid/e2e-project',
        featured: false,
        portfolioVisible: false,
        caseStudyPublished: false,
      },
    })
    expect(projectResponse.ok()).toBeTruthy()
    ids.project = (await projectResponse.json()).id

    await selectSandboxOrganization(page)
    await page.goto(`/admin/clients/${ids.client}`)
    await expect(page.getByRole('heading', { level: 1, name: `Client E2E ${runId}` })).toBeVisible()
    await expectAccessibleDetailPage(page)
    await page.goto(`/admin/projects/${ids.project}`)
    await expect(page.getByRole('heading', { level: 1, name: `Projet E2E ${runId}` })).toBeVisible()
    await expectAccessibleDetailPage(page)

    const numberResponse = await request.get('/api/admin/billing/next-number?kind=quote', { headers })
    expect(numberResponse.ok()).toBeTruthy()
    const quoteNumber = (await numberResponse.json()).number as string
    const quoteResponse = await request.post('/api/quotes', {
      headers,
      data: {
        clientId: ids.client,
        projectId: ids.project,
        number: quoteNumber,
        title: `Devis E2E ${runId}`,
        currency: 'CHF',
        status: 'sent',
        issuedAt: new Date().toISOString().slice(0, 10),
        items: [item],
      },
    })
    expect(quoteResponse.ok()).toBeTruthy()
    const quote = await quoteResponse.json()
    ids.quote = quote.id
    expect(quote.total_cents).toBe(13513)

    const unconfirmedConversionResponse = await request.post('/api/quotes/convert', {
      headers,
      data: { id: ids.quote },
    })
    expect(unconfirmedConversionResponse.status()).toBe(400)
    expect((await unconfirmedConversionResponse.json()).message).toContain('Confirme explicitement')

    const conversionResponses = await Promise.all([
      request.post('/api/quotes/convert', { headers, data: { id: ids.quote, confirmation: 'ACCEPTER_ET_FACTURER' } }),
      request.post('/api/quotes/convert', { headers, data: { id: ids.quote, confirmation: 'ACCEPTER_ET_FACTURER' } }),
    ])
    expect(conversionResponses.every(response => response.ok())).toBeTruthy()
    const conversions = await Promise.all(conversionResponses.map(response => response.json()))
    for (const result of conversions) conversionInvoiceIds.add(result.invoice.id)
    expect(conversions.filter(result => result.created)).toHaveLength(1)
    expect(conversions.filter(result => !result.created)).toHaveLength(1)
    expect(conversionInvoiceIds.size).toBe(1)
    const conversion = conversions.find(result => result.created) || conversions[0]
    ids.invoice = conversion.invoice.id
    expect(conversion.invoice.quote_id).toBe(ids.quote)
    expect(conversion.invoice.project_id).toBe(ids.project)

    const invoicesAfterConversionResponse = await request.get('/api/invoices', { headers })
    expect(invoicesAfterConversionResponse.ok()).toBeTruthy()
    const invoicesForQuote = (await invoicesAfterConversionResponse.json()).filter((invoice: { quote_id: number }) => invoice.quote_id === ids.quote)
    expect(invoicesForQuote).toHaveLength(1)

    const pdfResponse = await request.get(`/api/invoices/pdf?id=${ids.invoice}`, { headers })
    expect(pdfResponse.ok()).toBeTruthy()
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf')
    expect(pdfResponse.headers()['x-pdf-engine']).toBe('typst')
    const pdf = await pdfResponse.body()
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
    expect(pdf.byteLength).toBeGreaterThan(1_000)

    const unconfirmedPaymentResponse = await request.post('/api/invoices/payments', {
      headers,
      data: { invoiceId: ids.invoice, amountCents: conversion.invoice.total_cents, method: 'bank_transfer' },
    })
    expect(unconfirmedPaymentResponse.status()).toBe(400)
    expect((await unconfirmedPaymentResponse.json()).message).toContain('Confirme explicitement')

    await page.goto(`/admin/invoices?invoiceId=${ids.invoice}&clientId=${ids.client}&quoteId=${ids.quote}&journey=converted`)
    await expect(page.getByText(`La facture ${conversion.invoice.number} a été créée depuis le devis.`)).toBeVisible()
    const invoiceRow = page.getByRole('row').filter({ hasText: conversion.invoice.number })
    await invoiceRow.getByRole('button', { name: 'Paiement', exact: true }).click()
    const paymentDialog = page.getByRole('dialog', { name: 'Enregistrer un paiement' })
    await expect(paymentDialog).toBeVisible()
    await expect(paymentDialog.getByLabel(/Montant/)).toHaveValue('135.13')
    await paymentDialog.getByLabel('Référence').fill(`E2E-${runId}`)
    const paymentRequestPromise = page.waitForRequest(request => request.url().endsWith('/api/invoices/payments') && request.method() === 'POST')
    const paymentResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/invoices/payments') && response.request().method() === 'POST')
    await paymentDialog.getByRole('button', { name: 'Enregistrer le paiement' }).click()
    const [browserPaymentRequest, paidResponse] = await Promise.all([paymentRequestPromise, paymentResponsePromise])
    expect(paidResponse.ok()).toBeTruthy()
    const paymentResult = await paidResponse.json()
    expect(paymentResult.status).toBe('paid')
    expect(paymentResult.paidAmountCents).toBe(conversion.invoice.total_cents)
    expect(paymentResult.created).toBe(true)
    await expect(paymentDialog).toBeHidden()
    await expect(page.getByText(`La facture ${conversion.invoice.number} est entièrement payée.`)).toBeVisible()

    const submittedPayment = browserPaymentRequest.postDataJSON()

    const repeatedPaymentResponse = await request.post('/api/invoices/payments', {
      headers,
      data: submittedPayment,
    })
    expect(repeatedPaymentResponse.ok()).toBeTruthy()
    const repeatedPaymentResult = await repeatedPaymentResponse.json()
    expect(repeatedPaymentResult.created).toBe(false)
    expect(repeatedPaymentResult.payment.id).toBe(paymentResult.payment.id)

    const invoicesResponse = await request.get('/api/invoices', { headers })
    expect(invoicesResponse.ok()).toBeTruthy()
    const paidInvoice = (await invoicesResponse.json()).find((invoice: { id: number }) => invoice.id === ids.invoice)
    expect(paidInvoice.status).toBe('paid')
    expect(paidInvoice.paid_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(paidInvoice.payments).toHaveLength(1)

    await page.goto(`/admin/payments?invoiceId=${ids.invoice}`)
    await expect(page.getByText(`Le paiement de la facture ${conversion.invoice.number} est bien présent dans le journal et le CRM est à jour.`)).toBeVisible()
    const commercialJourney = page.getByRole('navigation', { name: 'Progression du parcours commercial' })
    await expect(commercialJourney).toBeVisible()
    await commercialJourney.getByRole('link', { name: 'Facture' }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/invoices\\?invoiceId=${ids.invoice}`))
    await page.goBack()
    await expect(page.getByText(`Le paiement de la facture ${conversion.invoice.number} est bien présent dans le journal et le CRM est à jour.`)).toBeVisible()

    const cockpitResponse = await request.get(`/api/project-cockpit?projectId=${ids.project}`, { headers })
    expect(cockpitResponse.ok()).toBeTruthy()
    const cockpit = await cockpitResponse.json()
    expect(cockpit.totals.finance.quotedCents).toBe(13513)
    expect(cockpit.totals.finance.invoicedCents).toBe(13513)
    expect(cockpit.totals.finance.collectedCents).toBe(13513)
  }
  finally {
    for (const invoiceId of conversionInvoiceIds) await request.delete(`/api/invoices?id=${invoiceId}`, { headers })
    if (ids.standaloneInvoice) await request.delete(`/api/invoices?id=${ids.standaloneInvoice}`, { headers })
    if (ids.quote) await request.delete(`/api/quotes?id=${ids.quote}`, { headers })
    if (ids.project) await request.delete(`/api/projects?id=${ids.project}`, { headers })
    if (ids.client) await request.delete(`/api/clients?id=${ids.client}`, { headers })
  }
})
