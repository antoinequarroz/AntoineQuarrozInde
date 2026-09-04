export type SitemapEntry = {
  path: string
  lastmod?: string
  changefreq: 'weekly' | 'monthly'
  priority: string
}

export type SitemapArticleRow = {
  slug: string
  published_at?: string | null
  updated_at?: string | null
  created_at: string
}

export type SitemapProjectRow = {
  slug: string
  case_study_published_at?: string | null
  updated_at?: string | null
  created_at: string
}

const legalLastmod = '2026-08-10T00:00:00.000Z'

export const sitemapStaticPaths = [
  '/',
  '/developpeur-web-valais',
  '/creation-site-internet-valais',
  '/refonte-site-web-valais',
  '/application-mobile-valais',
  '/en',
  '/de',
  '/blog',
  '/cas-clients-valais',
  '/confidentialite',
  '/conditions-utilisation',
  '/mentions-legales',
  '/en/confidentialite',
  '/en/conditions-utilisation',
  '/en/mentions-legales',
  '/de/confidentialite',
  '/de/conditions-utilisation',
  '/de/mentions-legales',
] as const

export function escapeSitemapXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function normalizeSiteUrl(value: string) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash) {
    throw new Error('sitemap_site_url_invalid')
  }
  return url.origin
}

function normalizeSlug(value: string) {
  const slug = value.trim()
  if (!slug) throw new Error('sitemap_slug_invalid')
  return encodeURIComponent(slug)
}

function normalizeLastmod(...candidates: Array<string | null | undefined>) {
  const value = candidates.find(candidate => Boolean(candidate?.trim()))?.trim()
  if (!value) throw new Error('sitemap_lastmod_missing')
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) throw new Error('sitemap_lastmod_invalid')
  return timestamp.toISOString()
}

export function buildSitemapEntries(
  articles: SitemapArticleRow[],
  projects: SitemapProjectRow[],
): SitemapEntry[] {
  const entries: SitemapEntry[] = sitemapStaticPaths.map(path => ({
    path,
    lastmod: /\/(confidentialite|conditions-utilisation|mentions-legales)$/.test(path) ? legalLastmod : undefined,
    changefreq: 'weekly',
    priority: path === '/' ? '1.0' : '0.8',
  }))

  const dynamicEntries: SitemapEntry[] = [
    ...articles.map(article => ({
      path: `/blog/${normalizeSlug(article.slug)}`,
      lastmod: normalizeLastmod(article.updated_at, article.published_at, article.created_at),
      changefreq: 'monthly' as const,
      priority: '0.8',
    })),
    ...projects.map(project => ({
      path: `/projets/${normalizeSlug(project.slug)}`,
      lastmod: normalizeLastmod(project.updated_at, project.case_study_published_at, project.created_at),
      changefreq: 'monthly' as const,
      priority: '0.9',
    })),
  ].sort((left, right) => left.path.localeCompare(right.path, 'fr'))

  const paths = new Set(entries.map(entry => entry.path))
  for (const entry of dynamicEntries) {
    if (paths.has(entry.path)) throw new Error('sitemap_path_duplicate')
    paths.add(entry.path)
    entries.push(entry)
  }

  return entries
}

export function renderSitemapXml(siteUrlValue: string, entries: SitemapEntry[]) {
  const siteUrl = normalizeSiteUrl(siteUrlValue)
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url>
    <loc>${escapeSitemapXml(`${siteUrl}${entry.path}`)}</loc>
${entry.lastmod ? `    <lastmod>${escapeSitemapXml(entry.lastmod)}</lastmod>\n` : ''}    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`
}
