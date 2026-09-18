import { describe, expect, it } from 'vitest'
import { resolveArticleMediaVariants } from '../shared/utils/articleMediaVariants'

describe('article media variants', () => {
  it('selects the reviewed mobile and social exports for the article', () => {
    expect(resolveArticleMediaVariants('decider-refonte-site-audit-sept-points')).toEqual({
      mobile: '/article-media/decider-refonte-site-audit-sept-points/blog-mobile-1120x800.png',
      linkedin: '/article-media/decider-refonte-site-audit-sept-points/linkedin-1200x627.png',
      x: '/article-media/decider-refonte-site-audit-sept-points/x-1200x628.png',
    })
  })

  it('keeps older articles on their existing cover', () => {
    expect(resolveArticleMediaVariants('autre-article')).toBeNull()
    expect(resolveArticleMediaVariants('__proto__')).toBeNull()
  })
})
