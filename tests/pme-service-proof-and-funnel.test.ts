import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('PME service proof and conversion path', () => {
  it('links every article to the PME service page', () => {
    const article = read('app/pages/blog/[slug].vue')
    expect(article).toContain('to="/creation-site-internet-valais"')
    expect(article).toContain('Voir la création de site pour PME')
  })

  it('renders an approved case study as a visible proof with its review and CTA', () => {
    const page = read('app/pages/creation-site-internet-valais.vue')
    expect(page).toContain('const featuredCase')
    expect(page).toContain('const featuredReview')
    expect(page).toContain('Étude de cas vérifiée')
    expect(page).toContain('Présenter mon projet')
    expect(page).toContain("trackPostHog('service_cta_clicked'")
  })

  it('attributes the contact funnel to the originating service page', () => {
    const contact = read('app/components/sections/ContactSection.vue')
    const endpoint = read('server/api/admin/posthog-stats.get.ts')
    const dashboard = read('app/pages/admin/analytics/index.vue')
    expect(contact).toContain("sessionStorage.getItem('aq_contact_origin')")
    expect(contact).toContain('origin_path: contactOriginPath.value')
    expect(endpoint).toContain('site_admin_service_funnels_30d')
    expect(endpoint).toContain("event = 'service_cta_clicked'")
    expect(endpoint).toContain("event = 'contact_form_started'")
    expect(endpoint).toContain("event = 'contact_sent'")
    expect(dashboard).toContain('posthog.serviceFunnel')
    expect(endpoint).toContain("properties.$pathname) = '/audit-ia-pme'")
    expect(dashboard).toContain('posthog.auditServiceFunnel')
  })

  it('keeps the root URL in French and exposes explicit alternate locales', () => {
    const config = read('nuxt.config.ts')
    const home = read('app/pages/index.vue')
    expect(config).toContain('detectBrowserLanguage: false')
    expect(config).toContain("defaultLocale: 'fr'")
    expect(home).toContain("hreflang: 'fr-CH'")
    expect(home).toContain("hreflang: 'en-US'")
    expect(home).toContain("hreflang: 'de-CH'")
    expect(home).toContain("hreflang: 'x-default'")
  })

  it('ships real before and after captures and the verified client review', () => {
    const casePage = read('app/pages/projets/[slug].vue')
    expect(casePage).toContain('Avant : première version')
    expect(casePage).toContain('Après : version actuelle')
    expect(casePage).toContain('Témoignage client')
    expect(read('public/case-studies/physiobaur-avant.png').length).toBeGreaterThan(100_000)
    expect(read('public/case-studies/physiobaur-apres.png').length).toBeGreaterThan(100_000)
  })
})
