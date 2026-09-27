import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('blog newsletter UI', () => {
  it('places a consented signup below each article and links the privacy policy', async () => {
    const [articlePage, signup, privacy] = await Promise.all([
      readFile('app/pages/blog/[slug].vue', 'utf8'),
      readFile('app/components/blog/NewsletterSignup.vue', 'utf8'),
      readFile('app/pages/confidentialite.vue', 'utf8'),
    ])

    expect(articlePage).toContain('<BlogNewsletterSignup v-if="!isIaPmeArticle" />')
    expect(signup).toContain("await $fetch('/api/newsletter'")
    expect(signup).toContain('v-model="consent"')
    expect(signup).toContain("localePath('/confidentialite')")
    expect(signup).toContain('Sans séquence commerciale automatique.')
    expect(signup).toContain('Vous recevrez ensuite un seul e-mail de bienvenue')
    expect(privacy).toContain("newsletterTitle: 'Newsletter et ressources pratiques'")
    expect(privacy).toContain('transmises à Lumail')
    expect(privacy).toContain('un seul e-mail de bienvenue après cette confirmation')
    expect(privacy).toContain('mise à disposition immédiatement')
  })

  it('offers the IA checklist on its landing page and the matching article', async () => {
    const [articlePage, landingPage, signup, endpoint] = await Promise.all([
      readFile('app/pages/blog/[slug].vue', 'utf8'),
      readFile('app/pages/ressources/checklist-ia-pme.vue', 'utf8'),
      readFile('app/components/blog/LeadMagnetSignup.vue', 'utf8'),
      readFile('server/api/ressources/[slug].get.ts', 'utf8'),
    ])

    expect(articlePage).toContain("article.value?.slug === 'ia-pme-commencer-sans-exposer-donnees'")
    expect(articlePage).toContain('<BlogLeadMagnetSignup v-if="isIaPmeArticle" compact />')
    expect(landingPage).toContain('<BlogLeadMagnetSignup')
    expect(signup).toContain("trackPostHog('lead_magnet_viewed'")
    expect(signup).toContain("trackPostHog('lead_magnet_submitted'")
    expect(signup).toContain("trackPostHog('lead_magnet_delivered'")
    expect(endpoint).toContain("Content-Disposition', 'attachment;")
  })
})
