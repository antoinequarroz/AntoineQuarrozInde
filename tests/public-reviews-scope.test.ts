import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('public review organization scope', () => {
  it('returns no reviews without a canonical organization and always filters by organization', async () => {
    const source = await readFile('server/api/reviews.get.ts', 'utf8')
    expect(source).toContain('if (!org?.id) return []')
    expect(source).toContain(".eq('organization_id', org.id)")
    expect(source.indexOf('if (!org?.id) return []')).toBeLessThan(source.indexOf('getSupabaseAdmin()'))
  })

  it('uses an allowlist and exposes hidden reviews only to authenticated managers', async () => {
    const endpoint = await readFile('server/api/reviews.get.ts', 'utf8')
    const store = await readFile('app/stores/reviews.ts', 'utf8')
    const adminPage = await readFile('app/pages/admin/reviews/index.vue', 'utf8')

    expect(endpoint).not.toContain(".select('*')")
    expect(endpoint).toContain("['owner', 'admin', 'manager']")
    expect(endpoint).toContain("query.eq('visible', true)")
    expect(store).toContain('headers: auth.authHeader()')
    expect(adminPage).toContain('void loadReviews(true)')
  })
})
