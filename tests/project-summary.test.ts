import { describe, expect, it } from 'vitest'
import { getProjectSummary } from '../app/utils/projectSummary'
import { resolveProjectPreview } from '../app/utils/projectPreview'

const project = {
  description: 'Un site pour le cabinet. Une seconde phrase réservée à la fiche.',
  descriptionEn: 'A website for the practice. More detail on its project page.',
  descriptionDe: 'Eine Website für die Praxis. Weitere Details auf der Projektseite.',
}

describe('portfolio card excerpts', () => {
  it('uses the first published sentence in the requested language', () => {
    expect(getProjectSummary(project, 'fr')).toEqual({ text: 'Un site pour le cabinet.', lang: 'fr' })
    expect(getProjectSummary(project, 'en')).toEqual({ text: 'A website for the practice.', lang: 'en' })
    expect(getProjectSummary(project, 'de')).toEqual({ text: 'Eine Website für die Praxis.', lang: 'de' })
  })

  it('marks the French fallback truthfully when translations are absent', () => {
    expect(getProjectSummary({ ...project, descriptionEn: '  ', descriptionDe: null }, 'en'))
      .toEqual({ text: 'Un site pour le cabinet.', lang: 'fr' })
    expect(getProjectSummary({ ...project, descriptionDe: null }, 'de').lang).toBe('fr')
  })

  it('bounds a long first sentence at a word boundary without adding claims', () => {
    const description = 'Un projet documenté '.repeat(15)
    const summary = getProjectSummary({ description }, 'fr')
    expect(summary.text.length).toBeLessThanOrEqual(125)
    expect(summary.text).toMatch(/…$/)
    expect(description.startsWith(summary.text.slice(0, -1))).toBe(true)
    expect(getProjectSummary({ description: '  ' }, 'fr').text).toBe('')
  })
})

describe('portfolio image sizes', () => {
  const source = 'https://raw.githubusercontent.com/antoinequarroz/lifxp/main/assets/brand/lifxp-ui-direction.png'

  it('uses wider responsive candidates for the grid without mutating the carousel preview', () => {
    const carousel = resolveProjectPreview(source)
    const grid = resolveProjectPreview(source, 'grid')
    expect(grid.srcset).toBe(carousel.srcset)
    expect(grid.sizes).toContain('46vw')
    expect(carousel.sizes).toContain('280px')
    expect(resolveProjectPreview(source).sizes).toBe(carousel.sizes)
    expect(resolveProjectPreview('https://example.com/new.png', 'grid')).toEqual({ src: 'https://example.com/new.png' })
  })
})
