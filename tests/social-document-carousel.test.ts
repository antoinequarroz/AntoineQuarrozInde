import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('LinkedIn document carousel review', () => {
  it('shows the attached PDF before approval', () => {
    const page = read('app/pages/admin/social/index.vue')
    const socialPreview = read('app/components/admin/SocialPostPreview.vue')
    const preview = read('app/components/admin/SocialDocumentPreview.vue')
    expect(page).toContain('AdminSocialPostPreview')
    expect(socialPreview).toContain('AdminSocialDocumentPreview')
    expect(socialPreview).toContain("post.media_kind === 'document' && post.media_url")
    expect(preview).toContain('Carrousel joint')
    expect(preview).toContain('Aperçu du carrousel')
    expect(preview).toContain('Ouvrir le PDF')
    expect(page).not.toContain('documentSlides(post)')
    expect(preview).not.toContain('object-cover')
    expect(preview).not.toContain('aspect-[4/5]')
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
