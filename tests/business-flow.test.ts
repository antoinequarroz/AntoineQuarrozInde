import { beforeAll, describe, expect, it, vi } from 'vitest'
import { computeTotals, normalizeBillingItems } from '../server/utils/billing'
import { normalizeInvoicePaymentState } from '../server/utils/invoiceState'

beforeAll(() => {
  vi.stubGlobal('createError', (input: { statusCode: number, message: string }) => Object.assign(new Error(input.message), input))
})

describe('parcours client vers paiement', () => {
  it('construit un projet rattaché à un client sans exposer les données privées', async () => {
    const { projectPayload } = await import('../server/utils/projectPayload')
    const payload = projectPayload({
      clientId: 42,
      title: 'Portail client',
      slug: 'portail-client',
      category: 'web',
      description: 'Un portail de suivi de projet.',
      descriptionEn: 'A project tracking portal.',
      descriptionDe: 'Ein Portal zur Projektverfolgung.',
      image: 'https://example.com/project.jpg',
      liveUrl: 'https://example.com/project',
      featured: true,
      caseStudyPublished: true,
      clientLabel: 'PME suisse',
      challenge: 'Centraliser les échanges.',
      solution: 'Un espace sécurisé et lisible.',
      outcome: 'Suivi simplifié pour le client.',
    }, 'org-test')

    expect(payload.client_id).toBe(42)
    expect(payload.client_label).toBe('PME suisse')
    expect(payload.description_en).toBe('A project tracking portal.')
    expect(payload.description_de).toBe('Ein Portal zur Projektverfolgung.')
    expect(payload).not.toHaveProperty('client_email')
  })

  it('publie un projet avec le minimum sans imposer les champs détaillés de l’étude de cas', async () => {
    const { projectPayload } = await import('../server/utils/projectPayload')
    const payload = projectPayload({
      title: 'Site vitrine',
      slug: 'site-vitrine',
      category: 'web',
      description: 'Une courte description.',
      image: 'https://example.com/cover.jpg',
      liveUrl: 'https://example.com',
      caseStudyPublished: true,
    }, 'org-test')

    expect(payload.case_study_published).toBe(true)
    expect(payload.challenge).toBeNull()
    expect(payload.solution).toBeNull()
    expect(payload.outcome).toBeNull()
    expect(payload.code_url).toBeNull()
  })

  it('exige une image et une URL publique, mais pas de lien GitHub', async () => {
    const { projectPayload } = await import('../server/utils/projectPayload')
    const base = {
      title: 'Site vitrine',
      slug: 'site-vitrine',
      category: 'web',
      description: 'Une courte description.',
      liveUrl: 'https://example.com',
    }

    expect(() => projectPayload(base, 'org-test')).toThrow('image is required')
    expect(() => projectPayload({ ...base, image: 'https://example.com/cover.jpg', liveUrl: '' }, 'org-test')).toThrow('liveUrl is required')
    expect(projectPayload({ ...base, image: 'https://example.com/cover.jpg' }, 'org-test').code_url).toBeNull()
  })

  it('conserve les mêmes totaux du devis à la facture', () => {
    const quoteItems = normalizeBillingItems([
      { label: 'Design UX/UI', quantity: 1, unitPriceCents: 180_000, taxRate: 8.1 },
      { label: 'Développement', quantity: 4, unitPriceCents: 95_000, taxRate: 8.1 },
    ])
    const invoiceItems = normalizeBillingItems(quoteItems.map(item => ({
      label: item.label,
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      taxRate: item.tax_rate,
    })))

    expect(computeTotals(invoiceItems)).toEqual(computeTotals(quoteItems))
    expect(computeTotals(invoiceItems).totalCents).toBe(605_360)
  })

  it('horodate automatiquement le paiement et efface la date si la facture est rouverte', () => {
    const now = new Date('2026-08-05T17:00:00.000Z')
    expect(normalizeInvoicePaymentState('paid', null, now)).toEqual({
      status: 'paid',
      paidAt: '2026-08-05',
    })
    expect(normalizeInvoicePaymentState('sent', '2026-08-04T12:00:00Z', now)).toEqual({
      status: 'sent',
      paidAt: null,
    })
  })

  it('refuse un statut ou une date de paiement invalides', () => {
    expect(() => normalizeInvoicePaymentState('unknown', null)).toThrow('Invalid invoice status')
    expect(() => normalizeInvoicePaymentState('paid', 'not-a-date')).toThrow('Invalid payment date')
  })
})
