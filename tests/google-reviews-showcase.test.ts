import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

describe('Google reviews showcase', () => {
  it('uses live Google reviews with accessible animated navigation', async () => {
    const source = await readFile('app/components/sections/ReviewsSection.vue', 'utf8')

    expect(source).toContain('googleStore.reviews.map')
    expect(source).toContain('activeReview')
    expect(source).toContain('role="tablist"')
    expect(source).toContain(':aria-selected="index === activeIndex"')
    expect(source).toContain('prefers-reduced-motion: reduce')
    expect(source).toContain('rel="noopener noreferrer"')
    expect(source).not.toContain('Avis client exemple')
  })

  it('does not write Google error bodies containing credential identifiers to logs', async () => {
    const source = await readFile('server/api/google-reviews.get.ts', 'utf8')

    expect(source).not.toContain('await response.text()')
    expect(source).toContain("console.error('Google Places request failed', response.status, response.statusText)")
  })
})
