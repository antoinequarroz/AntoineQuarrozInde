import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

describe('Google reviews showcase', () => {
  it('uses live Google reviews with accessible scroll-driven navigation', async () => {
    const source = await readFile('app/components/sections/ReviewsSection.vue', 'utf8')

    expect(source).toContain('googleStore.reviews.map')
    expect(source).toContain('railProgress')
    expect(source).toContain('translate3d(${railOffset}px, 0, 0)')
    expect(source).toContain('role="progressbar"')
    expect(source).toContain('linkifyReviewText(review.content)')
    expect(source).toContain('rel="noopener noreferrer nofollow"')
    expect(source).toContain('prefers-reduced-motion: reduce')
    expect(source).toContain('html.dark .reviews-showcase .reviews-grid')
    expect(source).not.toContain(':global(.dark)')
    expect(source).toContain('rel="noopener noreferrer"')
    expect(source).not.toContain('Avis client exemple')
    expect(source).not.toContain('Témoignage fictif')
    expect(source).toContain('const demoReviews: DisplayReview[] = import.meta.dev')
    expect(source).toContain('Aperçu local · non publié')
  })

  it('does not write Google error bodies containing credential identifiers to logs', async () => {
    const source = await readFile('server/api/google-reviews.get.ts', 'utf8')

    expect(source).not.toContain('await response.text()')
    expect(source).toContain("console.error('Google Places request failed', response.status, response.statusText)")
  })
})
