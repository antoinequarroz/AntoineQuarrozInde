export type ArticleMediaVariants = Readonly<{
  mobile: string
  linkedin: string
  x: string
}>

// A published article uses its usual cover until its reviewed channel exports
// have been added here and shipped with the site.
const variants: Readonly<Record<string, ArticleMediaVariants>> = {
  'application-web-ou-mobile-choisir-selon-usages-reels': {
    mobile: '/article-media/application-web-ou-mobile-choisir-selon-usages-reels/blog-mobile-1120x800.png',
    linkedin: '/article-media/application-web-ou-mobile-choisir-selon-usages-reels/linkedin-1200x627.png',
    x: '/article-media/application-web-ou-mobile-choisir-selon-usages-reels/x-1200x628.png',
  },
  'decider-refonte-site-audit-sept-points': {
    mobile: '/article-media/decider-refonte-site-audit-sept-points/blog-mobile-1120x800.png',
    linkedin: '/article-media/decider-refonte-site-audit-sept-points/linkedin-1200x627.png',
    x: '/article-media/decider-refonte-site-audit-sept-points/x-1200x628.png',
  },
}

export function resolveArticleMediaVariants(slug: string): ArticleMediaVariants | null {
  return Object.hasOwn(variants, slug) ? (variants[slug] ?? null) : null
}
