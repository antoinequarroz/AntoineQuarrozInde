import { expect, test, type Page } from '@playwright/test'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

async function login(page: Page) {
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email!)
  await page.getByLabel(/mot de passe/i).fill(password!)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/admin(?:\/)?$/)

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

test('sandbox covers client to paid invoice and cleans up business data', async ({ page, request }) => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')

  const accessToken = await login(page)
  const baseHeaders = { authorization: `Bearer ${accessToken}` }
  const organizationsResponse = await request.get('/api/admin/organizations', { headers: baseHeaders })
  expect(organizationsResponse.ok()).toBeTruthy()
  const organizations = await organizationsResponse.json() as Array<{ id: string, slug: string }>
  const sandbox = organizations.find(organization => organization.slug === 'aq-e2e-sandbox')
  expect(sandbox, 'The isolated AQ E2E Sandbox organization must exist').toBeTruthy()
  const headers = { ...baseHeaders, 'x-organization-id': sandbox!.id }

  const runId = `${Date.now()}-${test.info().retry}`
  const ids: { client?: number, project?: number, quote?: number, invoice?: number, standaloneInvoice?: number } = {}
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
    expect(standaloneInvoiceResponse.ok()).toBeTruthy()
    ids.standaloneInvoice = (await standaloneInvoiceResponse.json()).id

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
        status: 'draft',
        issuedAt: new Date().toISOString().slice(0, 10),
        items: [item],
      },
    })
    expect(quoteResponse.ok()).toBeTruthy()
    const quote = await quoteResponse.json()
    ids.quote = quote.id
    expect(quote.total_cents).toBe(13513)

    const conversionResponse = await request.post('/api/quotes/convert', {
      headers,
      data: { id: ids.quote },
    })
    expect(conversionResponse.ok()).toBeTruthy()
    const conversion = await conversionResponse.json()
    ids.invoice = conversion.invoice.id
    expect(conversion.invoice.quote_id).toBe(ids.quote)
    expect(conversion.invoice.project_id).toBe(ids.project)

    const pdfResponse = await request.get(`/api/invoices/pdf?id=${ids.invoice}`, { headers })
    expect(pdfResponse.ok()).toBeTruthy()
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf')
    expect(pdfResponse.headers()['x-pdf-engine']).toBe('typst')
    const pdf = await pdfResponse.body()
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
    expect(pdf.byteLength).toBeGreaterThan(1_000)

    const paidResponse = await request.post('/api/invoices/payments', {
      headers,
      data: {
        invoiceId: ids.invoice,
        amountCents: conversion.invoice.total_cents,
        method: 'bank_transfer',
        paidAt: new Date().toISOString().slice(0, 10),
        reference: `E2E-${runId}`,
      },
    })
    expect(paidResponse.ok()).toBeTruthy()
    const paymentResult = await paidResponse.json()
    expect(paymentResult.status).toBe('paid')
    expect(paymentResult.paidAmountCents).toBe(conversion.invoice.total_cents)

    const invoicesResponse = await request.get('/api/invoices', { headers })
    expect(invoicesResponse.ok()).toBeTruthy()
    const paidInvoice = (await invoicesResponse.json()).find((invoice: { id: number }) => invoice.id === ids.invoice)
    expect(paidInvoice.status).toBe('paid')
    expect(paidInvoice.paid_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(paidInvoice.payments).toHaveLength(1)

    const cockpitResponse = await request.get(`/api/project-cockpit?projectId=${ids.project}`, { headers })
    expect(cockpitResponse.ok()).toBeTruthy()
    const cockpit = await cockpitResponse.json()
    expect(cockpit.totals.finance.quotedCents).toBe(13513)
    expect(cockpit.totals.finance.invoicedCents).toBe(13513)
    expect(cockpit.totals.finance.collectedCents).toBe(13513)
  }
  finally {
    if (ids.invoice) await request.delete(`/api/invoices?id=${ids.invoice}`, { headers })
    if (ids.standaloneInvoice) await request.delete(`/api/invoices?id=${ids.standaloneInvoice}`, { headers })
    if (ids.quote) await request.delete(`/api/quotes?id=${ids.quote}`, { headers })
    if (ids.project) await request.delete(`/api/projects?id=${ids.project}`, { headers })
    if (ids.client) await request.delete(`/api/clients?id=${ids.client}`, { headers })
  }
})
