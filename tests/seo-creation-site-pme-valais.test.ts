import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('creation site PME Valais landing page', () => {
  it('targets the local PME intent with useful decision content and internal links', async () => {
    const page = await readFile('app/pages/creation-site-internet-valais.vue', 'utf8')

    expect(page).toContain("name: 'Création de site web pour PME en Valais'")
    expect(page).toContain("title: 'Création de site web pour PME en Valais | Antoine Quarroz'")
    expect(page).toContain('Quel site est utile à votre PME valaisanne ?')
    expect(page).toContain('De quoi dépend le prix d’un site web ?')
    expect(page).toContain('Questions fréquentes')
    expect(page).toContain('to="/cas-clients-valais"')
    expect(page).toContain('to="/refonte-site-web-valais"')
    expect(page).toContain('to="/developpeur-web-valais"')
  })

  it('only exposes approved case studies and avoids unsupported commercial promises', async () => {
    const page = await readFile('app/pages/creation-site-internet-valais.vue', 'utf8')

    expect(page).toContain('project.caseStudyPublished')
    expect(page).toContain('project.caseStudyApprovedAt')
    expect(page).toContain('project.relatedServicePaths.includes(service.path)')
    expect(page).not.toMatch(/CHF\s*[\d']/)
    expect(page).not.toContain('résultat garanti')
    expect(page).not.toContain('[Nom du client]')
    expect(page).not.toContain('[Résultat mesurable]')
  })
})
