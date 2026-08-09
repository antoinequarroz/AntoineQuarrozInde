import { describe, expect, it } from 'vitest'
import { computeTotals, normalizeBillingCurrency, normalizeBillingItems } from '../server/utils/billing'
import { canGenerateTypstDocument, type TypstBillingData } from '../server/utils/typstBilling'

describe('facturation V2', () => {
  it('accepte uniquement les devises prises en charge', () => {
    expect(normalizeBillingCurrency('chf')).toBe('CHF')
    expect(normalizeBillingCurrency('EUR')).toBe('EUR')
    expect(() => normalizeBillingCurrency('CHF500')).toThrow(/CHF ou EUR/)
  })

  it('normalise les lignes et calcule les montants CHF avec TVA', () => {
    const items = normalizeBillingItems([
      { label: 'Conception', quantity: 2, unitPriceCents: 12_500, taxRate: 8.1 },
      { label: 'Hébergement', quantity: 1, unitPriceCents: 2_000, taxRate: 0 },
    ])

    expect(items).toHaveLength(2)
    expect(items[0]?.total_cents).toBe(27_025)
    expect(computeTotals(items)).toEqual({
      subtotalCents: 27_000,
      taxCents: 2_025,
      totalCents: 29_025,
    })
  })

  it('écarte les lignes sans libellé et sécurise les valeurs invalides', () => {
    const items = normalizeBillingItems([
      { label: '', quantity: 1, unitPriceCents: 500, taxRate: 8.1 },
      { label: 'Audit', quantity: -4, unitPriceCents: 1_000, taxRate: -2 },
    ])

    expect(items).toEqual([
      {
        position: 1,
        label: 'Audit',
        description: null,
        quantity: 1,
        unit_price_cents: 1_000,
        tax_rate: 0,
        total_cents: 1_000,
      },
    ])
    expect(computeTotals(items)).toEqual({ subtotalCents: 1_000, taxCents: 0, totalCents: 1_000 })
  })

  it('génère une QR-facture même si l’adresse du débiteur reste à compléter', () => {
    const document: TypstBillingData = {
      documentTitle: 'Facture',
      number: 'FAC-2026-0042',
      subject: '',
      currency: 'CHF',
      issuedAt: '2026-08-06',
      dueAt: '2026-09-05',
      statusLabel: 'Brouillon',
      notes: '',
      terms: '',
      subtotalCents: 1_000,
      taxCents: 81,
      totalCents: 1_081,
      issuer: { name: 'Antoine Quarroz', street: 'Rue Exemple', building: '1', postalCode: '1950', city: 'Sion', country: 'CH' },
      client: { name: 'Client Test', street: '', building: '', postalCode: '', city: '', country: 'CH' },
      items: [{ label: 'Prestation', description: '', quantity: 1, unitPriceCents: 1_000, taxRate: 8.1, totalCents: 1_081 }],
      includeQr: true,
      qr: {
        account: 'CH93 0076 2011 6238 5295 7',
        referenceType: 'NON',
        reference: null,
        additionalInfo: 'Facture FAC-2026-0042',
        includeDebtor: false,
      },
    }

    expect(canGenerateTypstDocument(document)).toBe(true)
  })
})
