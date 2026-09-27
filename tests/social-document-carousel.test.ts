import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('LinkedIn document carousel review', () => {
  it('shows the attached PDF before approval', () => {
    const page = read('app/pages/admin/social/index.vue')
    expect(page).toContain('Carrousel joint')
    expect(page).toContain('documentSlides(post)')
    expect(page).toContain('Fais défiler horizontalement pour relire les 7 pages avant publication.')
    expect(page).toContain('Aperçu du carrousel')
    expect(page).toContain('Carrousel inclus')
  })

  it('carries document metadata through the private APIs', () => {
    const draftApi = read('server/api/hermes/social-drafts.post.ts')
    const queueApi = read('server/api/hermes/social-publications.get.ts')
    const adminApi = read('server/api/admin/social-posts.get.ts')
    for (const source of [draftApi, queueApi, adminApi]) {
      expect(source).toContain('media_kind')
      expect(source).toContain('media_url')
      expect(source).toContain('media_title')
    }
    expect(draftApi).toContain('enriched: true')
  })
})
