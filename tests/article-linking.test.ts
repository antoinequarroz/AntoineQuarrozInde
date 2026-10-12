import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ARTICLE_HUBS, articleCluster, articleContactContext, articleHub, articlePath, hubArticles, relatedArticles } from '../shared/utils/articleLinking'
import articles from './fixtures/published-article-links.json'

describe('public thematic linking', () => {
  it('covers each published article with its hub and at least two discoverable entry paths', () => {
    const paths = Object.values(ARTICLE_HUBS).map(hub => hub.path).concat(['/application-mobile-valais'])
    for (const article of articles) {
      const hub = articleHub(article)
      expect(paths).toContain(hub.path)
      expect(hubArticles(articles, hub.path).map(item => item.slug)).toContain(article.slug)
      const inbound = articles.filter(source => relatedArticles(articles, source).some(target => target.slug === article.slug)).length
      // Every article is in /blog and its relevant service hub; personal stories
      // instead have sibling links and remain in the blog, without a forced offer.
      expect((hub.path === '/blog' ? 1 : 2) + inbound).toBeGreaterThanOrEqual(2)
      const related = relatedArticles(articles, article)
      expect(related.length).toBeGreaterThanOrEqual(1)
      expect(related.length).toBeLessThanOrEqual(3)
      expect(related.every(target => target.slug !== article.slug)).toBe(true)
    }
  })
  it('uses service-specific destinations instead of a universal site creation link', () => {
    const find = (slug: string) => articles.find(article => article.slug === slug)!
    expect(articleHub(find('refonte-site-quelles-pages-contenus-conserver')).path).toBe('/refonte-site-web-valais')
    expect(articleHub(find('envvault-code-github-configurations')).path).toBe('/developpeur-web-valais')
    expect(articleHub(find('repet-application-societes-musicales')).path).toBe('/application-mobile-valais')
    expect(articleHub(find('agent-ia-ou-automatisation-classique-pme')).path).toBe('/audit-ia-pme')
    expect(articleHub(find('1.-pourquoi-je-me-suis-lancé-dans-le-développement-web')).path).toBe('/blog')
    expect(articleContactContext(find('estimer-budget-reel-site-internet-suisse'))).toBe('budget')
    expect(articleContactContext(find('decider-refonte-site-audit-sept-points'))).toBe('refonte')
  })
  it('never exposes drafts, self-links, duplicates or arbitrary external destinations', () => {
    const current = articles.find(article => article.slug === 'estimer-budget-reel-site-internet-suisse')!
    const draft = { ...articles.find(article => article.slug === 'comparer-deux-devis-site-internet-points-verifier')!, published: false }
    const inputs = articles.filter(article => article.slug !== draft.slug).concat(draft)
    expect(hubArticles(inputs, articleHub(current).path).some(article => article.slug === draft.slug)).toBe(false)
    expect(relatedArticles(inputs, current).some(article => article.slug === draft.slug)).toBe(false)
    expect(hubArticles(inputs, 'https://evil.test')).toEqual([])
    expect(articlePath({ slug: 'préparer-la-création-d’un-site-vitrine-en-valais-:-la-checklist' })).toBe('/blog/pr%C3%A9parer-la-cr%C3%A9ation-d%E2%80%99un-site-vitrine-en-valais-%3A-la-checklist')
    expect(relatedArticles([current], current)).toEqual([])
  })
  it('classifies new articles conservatively by their explicit subject', () => {
    expect(articleCluster({ slug: 'migration-site', title: 'Préparer une refonte avec des redirections' })).toBe('refonte')
    expect(articleCluster({ slug: 'outil-pme', title: 'Application métier : définir les rôles' })).toBe('applications')
    expect(articleCluster({ slug: 'nouveau-retour', title: 'Une semaine dans mon activité' })).toBe('pratique')
  })
  it('renders hub resources on all five service pages and tracks the refonte contact origin', () => {
    for (const path of Object.values(ARTICLE_HUBS).map(hub => hub.path).filter(path => path !== '/blog').concat(['/application-mobile-valais'])) {
      const source = readFileSync(`app/pages${path}.vue`, 'utf8')
      expect(source).toContain(`<BlogServiceResources service-path="${path}"`)
    }
    const source = readFileSync('app/pages/refonte-site-web-valais.vue', 'utf8')
    expect(source).toContain("sessionStorage.setItem('aq_contact_origin', service.path)")
    expect(source).toContain('to="/#contact-form"')
    expect(source).toContain('redirections permanentes')
  })
})
