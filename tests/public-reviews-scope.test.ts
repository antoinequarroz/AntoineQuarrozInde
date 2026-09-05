import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('public review organization scope', () => {
  it('returns no reviews without a canonical organization and always filters by organization', async () => {
    const source = await readFile('server/api/reviews.get.ts', 'utf8')
    expect(source).toContain('if (!org?.id) return []')
    expect(source).toContain(".eq('organization_id', org.id)")
    expect(source.indexOf('if (!org?.id) return []')).toBeLessThan(source.indexOf('getSupabaseAdmin()'))
  })
})
