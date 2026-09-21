import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('blog newsletter UI', () => {
  it('places the consented signup below every article and links the privacy policy', async () => {
    const [articlePage, signup, privacy] = await Promise.all([
      readFile('app/pages/blog/[slug].vue', 'utf8'),
      readFile('app/components/blog/NewsletterSignup.vue', 'utf8'),
      readFile('app/pages/confidentialite.vue', 'utf8'),
    ])

    expect(articlePage).toContain('<BlogNewsletterSignup />')
    expect(signup).toContain("await $fetch('/api/newsletter'")
    expect(signup).toContain('v-model="consent"')
    expect(signup).toContain("localePath('/confidentialite')")
    expect(signup).toContain('Sans séquence commerciale automatique.')
    expect(privacy).toContain("newsletterTitle: 'Newsletter'")
    expect(privacy).toContain('transmis à Lumail')
  })
})
