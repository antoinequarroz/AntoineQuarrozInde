import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { sitemapStaticPaths } from '../server/utils/sitemapDiscovery'

const legalPage = readFileSync(new URL('../app/pages/mentions-legales.vue', import.meta.url), 'utf8')
const footer = readFileSync(new URL('../app/components/layout/AppFooter.vue', import.meta.url), 'utf8')
const privacy = readFileSync(new URL('../app/pages/confidentialite.vue', import.meta.url), 'utf8')

describe('public legal information', () => {
  it('publishes the operator identity and required contact details', () => {
    expect(legalPage).toContain('Antoine Quarroz')
    expect(legalPage).toContain('Indépendant — entreprise individuelle')
    expect(legalPage).toContain('Rue de l’Evouette 5')
    expect(legalPage).toContain('1969 Saint-Martin VS')
    expect(legalPage).toContain('info@antoinequarroz.ch')
    expect(legalPage).toContain('+41 79 157 64 50')
  })

  it('links privacy, hosting and navigation without exposing bank details', () => {
    expect(legalPage).toContain("localePath('/confidentialite')")
    expect(legalPage).toContain('Infomaniak Network SA')
    expect(legalPage).not.toMatch(/\bIBAN\b/i)
    expect(footer).toContain("localePath('/mentions-legales')")
    expect(sitemapStaticPaths).toContain('/mentions-legales')
    expect(sitemapStaticPaths).toContain('/en/mentions-legales')
    expect(sitemapStaticPaths).toContain('/de/mentions-legales')
  })

  it('documents the real CRM and analytics data flow', () => {
    expect(privacy).toContain('Plausible')
    expect(privacy).toContain('CRM')
    expect(privacy).toContain('UTM')
    expect(privacy).toContain('Stripe')
    expect(privacy).toContain('ten years')
    expect(footer).toContain('text-gray-600 dark:text-gray-300')
  })
})
