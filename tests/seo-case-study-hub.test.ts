import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('case study discovery hub', () => {
  it('loads projects before SSR and lists every published case study independently from the portfolio', async () => {
    const page = await readFile('app/pages/cas-clients-valais.vue', 'utf8')

    const loadIndex = page.indexOf('await projectsStore.ensureLoaded()')
    const publishedFilterIndex = page.indexOf('projectsStore.projects.filter(project => project.caseStudyPublished)')
    const templateIndex = page.indexOf('<template>')

    expect(loadIndex).toBeGreaterThan(-1)
    expect(publishedFilterIndex).toBeGreaterThan(loadIndex)
    expect(templateIndex).toBeGreaterThan(publishedFilterIndex)
    expect(page).not.toContain('portfolioVisible')
    expect(page).toContain('v-for="project in publishedCases"')
    expect(page).toContain(':to="localePath(`/projets/${project.slug}`)"')
  })

  it('does not keep fictional case studies as a public source of truth', async () => {
    const page = await readFile('app/pages/cas-clients-valais.vue', 'utf8')

    expect(page).not.toContain("const cases = [")
    expect(page).not.toContain('Etablissement local - Valais')
    expect(page).not.toContain('Cabinet sante - Valais central')
    expect(page).not.toContain('PME de services - Bas-Valais')
  })

  it('provides a useful empty state with routes to continue', async () => {
    const page = await readFile('app/pages/cas-clients-valais.vue', 'utf8')

    expect(page).toContain('v-if="publishedCases.length"')
    expect(page).toContain('Les prochaines études arrivent bientôt')
    expect(page).toContain("localePath('/#portfolio')")
    expect(page).toContain("localePath('/#contact')")
  })

  it('adds a descriptive public link to the French-only hub', async () => {
    const footer = await readFile('app/components/layout/AppFooter.vue', 'utf8')

    expect(footer).toContain("{ label: 'Cas clients en Valais', href: '/cas-clients-valais' }")
    expect(footer).toContain('v-if="locale === \'fr\'"')
    expect(footer).toContain('<NuxtLink')
    expect(footer).toContain(':to="item.href"')
  })
})
