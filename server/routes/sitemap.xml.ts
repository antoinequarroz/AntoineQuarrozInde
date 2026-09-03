type SitemapEntry = {
  path: string
  lastmod?: string
  changefreq: 'weekly' | 'monthly'
  priority: string
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '')
  const now = new Date().toISOString()
  const legalLastmod = '2026-08-10T00:00:00.000Z'

  const staticPaths = [
    '/',
    '/developpeur-web-valais',
    '/creation-site-internet-valais',
    '/refonte-site-web-valais',
    '/application-mobile-valais',
    '/en',
    '/de',
    '/blog',
    '/confidentialite',
    '/conditions-utilisation',
    '/mentions-legales',
    '/en/confidentialite',
    '/en/conditions-utilisation',
    '/en/mentions-legales',
    '/de/confidentialite',
    '/de/conditions-utilisation',
    '/de/mentions-legales',
  ]

  const entries: SitemapEntry[] = staticPaths.map(path => ({
    path,
    lastmod: /\/(confidentialite|conditions-utilisation|mentions-legales)$/.test(path) ? legalLastmod : undefined,
    changefreq: 'weekly',
    priority: path === '/' ? '1.0' : '0.8',
  }))

  try {
    const supabase = getSupabaseAdmin()
    const { data: projects, error } = await supabase
      .from('projects')
      .select('slug, created_at, completed_at')
      .eq('case_study_published', true)

    if (error) throw error

    for (const project of projects ?? []) {
      const lastmod = project.completed_at || project.created_at || now
      entries.push({
        path: `/projets/${encodeURIComponent(project.slug)}`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.9',
      })
    }
  }
  catch (error) {
    console.error('Unable to load dynamic sitemap entries', error)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url>
    <loc>${escapeXml(`${siteUrl}${entry.path}`)}</loc>
${entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n` : ''}    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  setHeader(event, 'content-type', 'application/xml; charset=UTF-8')
  return xml
})
