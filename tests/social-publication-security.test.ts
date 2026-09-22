import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('social publication queue', () => {
  it('accepts standalone posts only for the canonical homepage', () => {
    const validation = read('server/utils/socialPublication.ts')
    const publisher = read('scripts/hermes/publish_social.py')
    const adminPage = read('app/pages/admin/social/index.vue')

    expect(validation).toContain("const SITE_HOME = 'https://www.antoinequarroz.ch/'")
    expect(validation).toContain('articleUrl !== SITE_HOME')
    expect(publisher).toContain('CANONICAL_SITE_HOME = "https://www.antoinequarroz.ch/"')
    expect(adminPage).toContain('Voir le lien associé')
  })

  it('keeps the database tables server-only', () => {
    const migration = read('supabase/migrations/20260914071740_add_social_publication_queue.sql')
    expect(migration).toContain('alter table public.social_posts enable row level security')
    expect(migration).toContain('revoke all on table public.social_posts from public, anon, authenticated')
    expect(migration).toContain('grant select, insert, update, delete on table public.social_posts to service_role')
    expect(migration).not.toMatch(/create policy/i)
  })

  it('requires admin MFA and explicit confirmation for approval', () => {
    const route = read('server/api/admin/social-posts/[id]/approve.post.ts')
    expect(route).toContain('requireAdmin(event)')
    expect(route).toContain('SOCIAL_SCHEDULE_CONFIRMATION')
    expect(route).toContain('SOCIAL_PUBLISH_NOW_CONFIRMATION')
    expect(route).not.toContain('social_platform_connections')
    expect(route).not.toContain('linkedin.com/rest/posts')
    expect(route).not.toContain('api.x.com')
  })

  it('claims an approved post before an external platform write', () => {
    const source = read('scripts/hermes/publish_social.py')
    const claim = source.indexOf('"action": "claim"')
    expect(claim).toBeLessThan(source.indexOf('result = publish_linkedin(', claim))
    expect(source).toContain('HERMES_PUBLISH_TOKEN')
    expect(source).toContain('"action": "complete"')
    expect(source).toContain('"action": "fail"')
  })

  it('separates the 18:00 approval from an explicit publish-now action', () => {
    const adminPage = read('app/pages/admin/social/index.vue')
    expect(adminPage).toContain('Valider pour 18 h')
    expect(adminPage).toContain('Publier maintenant')
    expect(adminPage).toContain('si la connexion est prête')
    expect(adminPage).not.toContain('Approuver et publier')
  })

  it('keeps scheduled approvals server-side until their due time', () => {
    const migration = read('supabase/migrations/20260922161000_schedule_social_publications.sql')
    const queue = read('server/api/hermes/social-publications.get.ts')
    const approval = read('server/api/admin/social-posts/[id]/approve.post.ts')

    expect(migration).toContain('publish_after <= now()')
    expect(migration).toContain("time zone 'Europe/Zurich'")
    expect(queue).toContain(".lte('publish_after', new Date().toISOString())")
    expect(approval).toContain("mode === 'now' ? new Date() : nextSocialPublicationAt()")
  })

  it('removes rejected proposals from the social dashboard while keeping their audit record', () => {
    const adminPage = read('app/pages/admin/social/index.vue')
    const listRoute = read('server/api/admin/social-posts.get.ts')
    const updateRoute = read('server/api/admin/social-posts/[id].put.ts')

    expect(adminPage).not.toContain("['draft', 'failed', 'rejected']")
    expect(adminPage).toContain('Publication refusée et retirée du tableau')
    expect(listRoute).toContain(".neq('status', 'rejected')")
    expect(updateRoute).toContain("updates.status = 'rejected'")
  })
})
