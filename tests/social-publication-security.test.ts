import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('social publication queue', () => {
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
    expect(route).toContain('SOCIAL_APPROVAL_CONFIRMATION')
    expect(route).toContain("connection?.state !== 'ready'")
    expect(route).not.toContain('linkedin.com/rest/posts')
    expect(route).not.toContain('api.x.com')
  })

  it('claims an approved post before an external platform write', () => {
    const source = read('scripts/hermes/publish_social.py')
    expect(source.indexOf('"action": "claim"')).toBeLessThan(source.indexOf('publish_linkedin(claimed'))
    expect(source).toContain('HERMES_PUBLISH_TOKEN')
    expect(source).toContain('"action": "complete"')
    expect(source).toContain('"action": "fail"')
  })
})
