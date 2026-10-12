export type ArticleCluster = 'site' | 'refonte' | 'applications' | 'ia' | 'pratique'
export type ArticleContactContext = 'diagnostic' | 'site' | 'budget' | 'refonte'
export interface LinkableArticle { slug: string; title: string; published: boolean; publishedAt?: string | null }

export const ARTICLE_HUBS = {
  site: { path: '/creation-site-internet-valais', label: 'Créer un site pour votre activité', title: 'Préparer votre projet de site', body: 'Objectifs, contenus, budget : découvrez comment je cadre et réalise un site adapté à votre activité.', cta: 'Voir mon accompagnement pour créer un site en Valais' },
  refonte: { path: '/refonte-site-web-valais', label: 'Refonte de site web', title: 'Faire évoluer votre site existant', body: 'Un audit aide à décider ce qu’il faut conserver, corriger ou reconstruire, puis à préparer la migration.', cta: 'Découvrir mon accompagnement pour une refonte' },
  applications: { path: '/developpeur-web-valais', label: 'Applications et outils métier', title: 'Cadrer un outil adapté à vos usages', body: 'Décrivez les utilisateurs, les tâches et les outils actuels : nous préciserons les fonctions réellement utiles.', cta: 'Voir mon accompagnement en développement web' },
  ia: { path: '/audit-ia-pme', label: 'IA et automatisation', title: 'Choisir un usage IA utile à votre équipe', body: 'Comparer une règle simple, une automatisation et l’IA permet de préparer un premier test mesurable.', cta: 'Découvrir l’audit IA pour PME' },
  pratique: { path: '/blog', label: 'Retours de développement', title: 'Explorer mes retours de terrain', body: 'Des choix de développement, des projets en cours et ce que j’apprends au fil de leur réalisation.', cta: 'Lire les autres retours de développement' },
} as const

// Reviewed exceptions take precedence over broad terms in personal stories.
const overrides: Record<string, ArticleCluster> = {
  'developpement-agentique-evolution-metier-developpeur': 'applications',
  'envvault-code-github-configurations': 'applications',
  'repet-application-societes-musicales': 'applications',
}
const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr')
export function articleCluster(article: Pick<LinkableArticle, 'slug' | 'title'>): ArticleCluster {
  if (overrides[article.slug]) return overrides[article.slug]!
  if (/^[1-6]\./.test(article.slug)) return 'pratique'
  const text = normalize(article.slug + ' ' + article.title)
  if (/refonte/.test(text)) return 'refonte'
  if (/\bia\b|intelligence.artificielle|hyperframes|chatgpt|claude.*copilot|automatisation/.test(text)) return 'ia'
  if (/application|outil.metier|remplacer.excel/.test(text)) return 'applications'
  if (/site|cahier.des.charges|cms|projet.web|hebergement|agence.web|freelance.*valais|techsolve/.test(text)) return 'site'
  return 'pratique'
}
export function articleHub(article: Pick<LinkableArticle, 'slug' | 'title'>) {
  if (article.slug === 'repet-application-societes-musicales' || article.slug === 'application-web-ou-mobile-choisir-selon-usages-reels') {
    return { ...ARTICLE_HUBS.applications, path: '/application-mobile-valais', cta: 'Préparer une application mobile adaptée à vos usages' }
  }
  return ARTICLE_HUBS[articleCluster(article)]
}
export function articleContactContext(article: Pick<LinkableArticle, 'slug' | 'title'>): ArticleContactContext {
  if (article.slug === 'estimer-budget-reel-site-internet-suisse') return 'budget'
  const cluster = articleCluster(article)
  return cluster === 'site' ? 'site' : cluster === 'refonte' ? 'refonte' : 'diagnostic'
}
export const articlePath = (article: Pick<LinkableArticle, 'slug'>) => `/blog/${encodeURIComponent(article.slug)}`

export function hubArticles<T extends LinkableArticle>(articles: T[], path: string): T[] {
  const cluster = path === '/application-mobile-valais' ? 'applications'
    : (Object.keys(ARTICLE_HUBS) as ArticleCluster[]).find(key => ARTICLE_HUBS[key].path === path)
  if (!cluster) return []
  return articles.filter(article => article.published && articleCluster(article) === cluster)
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || a.slug.localeCompare(b.slug))
}

// Editorial relationships: each suggestion answers the next question raised by
// the source article. Slugs stay stable when the CMS title is edited.
const relatedSlugs: Record<string, string[]> = {
  'estimer-budget-reel-site-internet-suisse': ['comparer-deux-devis-site-internet-points-verifier', 'wordpress-ou-cms-sur-mesure-pme'],
  'comparer-deux-devis-site-internet-points-verifier': ['estimer-budget-reel-site-internet-suisse', 'rediger-cahier-des-charges-web-utile-sans-jargon-technique'],
  'rediger-cahier-des-charges-web-utile-sans-jargon-technique': ['preparer-contenus-avant-creation-site-professionnel', 'idee-mise-en-ligne-projet-web-bien-cadre'],
  'preparer-contenus-avant-creation-site-professionnel': ['préparer-la-création-d’un-site-vitrine-en-valais-:-la-checklist', 'rediger-cahier-des-charges-web-utile-sans-jargon-technique'],
  'préparer-la-création-d’un-site-vitrine-en-valais-:-la-checklist': ['preparer-contenus-avant-creation-site-professionnel', 'estimer-budget-reel-site-internet-suisse'],
  'hebergement-site-web-suisse-criteres-pme': ['wordpress-ou-cms-sur-mesure-pme', 'estimer-budget-reel-site-internet-suisse'],
  'wordpress-ou-cms-sur-mesure-pme': ['hebergement-site-web-suisse-criteres-pme', 'refonte-site-quelles-pages-contenus-conserver'],
  'agence-locale-ou-plateforme-en-ligne-pour-creer-un-site-en-suisse': ['agence-web-ou-developpeur-freelance-en-valais-comment-choisir', 'comparer-deux-devis-site-internet-points-verifier'],
  'techsolve-webidentity-ou-freelance-choisir-selon-son-projet': ['agence-web-ou-developpeur-freelance-en-valais-comment-choisir', 'agence-locale-ou-plateforme-en-ligne-pour-creer-un-site-en-suisse'],
  'agence-web-ou-developpeur-freelance-en-valais-comment-choisir': ['agence-locale-ou-plateforme-en-ligne-pour-creer-un-site-en-suisse', 'rediger-cahier-des-charges-web-utile-sans-jargon-technique'],
  'idee-mise-en-ligne-projet-web-bien-cadre': ['rediger-cahier-des-charges-web-utile-sans-jargon-technique', 'estimer-budget-reel-site-internet-suisse'],
  'decider-refonte-site-audit-sept-points': ['refonte-site-quelles-pages-contenus-conserver', 'wordpress-ou-cms-sur-mesure-pme'],
  'refonte-site-quelles-pages-contenus-conserver': ['decider-refonte-site-audit-sept-points', 'preparer-contenus-avant-creation-site-professionnel'],
  'mesurer-automatisation-ia-gain-temps': ['agent-ia-ou-automatisation-classique-pme', 'ia-pme-commencer-sans-exposer-donnees'],
  'agent-ia-ou-automatisation-classique-pme': ['mesurer-automatisation-ia-gain-temps', 'chatgpt-claude-copilot-gemini-quel-outil-pme-suisse'],
  'chatgpt-claude-copilot-gemini-quel-outil-pme-suisse': ['ia-pme-commencer-sans-exposer-donnees', 'agent-ia-ou-automatisation-classique-pme'],
  'ia-pme-commencer-sans-exposer-donnees': ['mesurer-automatisation-ia-gain-temps', 'chatgpt-claude-copilot-gemini-quel-outil-pme-suisse'],
  'creer-contenu-ia-hyperframes-moteur-video-sur-mesure': ['developpement-agentique-evolution-metier-developpeur', 'mesurer-automatisation-ia-gain-temps'],
  'envvault-code-github-configurations': ['developpement-agentique-evolution-metier-developpeur', 'droits-acces-tracabilite-application-metier'],
  'developpement-agentique-evolution-metier-developpeur': ['envvault-code-github-configurations', 'creer-contenu-ia-hyperframes-moteur-video-sur-mesure'],
  'droits-acces-tracabilite-application-metier': ['application-sur-mesure-ou-logiciel-standard-pme-valaisanne', 'envvault-code-github-configurations'],
  'repet-application-societes-musicales': ['application-web-ou-mobile-choisir-selon-usages-reels', 'droits-acces-tracabilite-application-metier'],
  'application-web-ou-mobile-choisir-selon-usages-reels': ['repet-application-societes-musicales', 'application-sur-mesure-ou-logiciel-standard-pme-valaisanne'],
  'remplacer-excel-outil-metier-criteres-etapes': ['application-sur-mesure-ou-logiciel-standard-pme-valaisanne', 'droits-acces-tracabilite-application-metier'],
  'application-sur-mesure-ou-logiciel-standard-pme-valaisanne': ['remplacer-excel-outil-metier-criteres-etapes', 'application-web-ou-mobile-choisir-selon-usages-reels'],
}

export function relatedArticles<T extends LinkableArticle>(articles: T[], current: LinkableArticle): T[] {
  const publicArticles = articles.filter(article => article.published && article.slug !== current.slug)
  if (relatedSlugs[current.slug]) {
    return relatedSlugs[current.slug]!.flatMap(slug => {
      const article = publicArticles.find(item => item.slug === slug)
      return article ? [article] : []
    })
  }
  // For new topics and personal stories, select siblings with shared title terms.
  const words = (title: string) => normalize(title).match(/[a-z]{4,}/g)?.filter(word => !['pour', 'avec', 'dans', 'sans', 'comment', 'site', 'suis', 'mais', 'plus', 'votre', 'avec'].includes(word)) ?? []
  const terms = new Set(words(current.title))
  return publicArticles.filter(article => articleCluster(article) === articleCluster(current))
    .map(article => ({ article, score: words(article.title).filter(word => terms.has(word)).length }))
    .sort((a, b) => b.score - a.score || (b.article.publishedAt ?? '').localeCompare(a.article.publishedAt ?? ''))
    .slice(0, 2).map(item => item.article)
}
