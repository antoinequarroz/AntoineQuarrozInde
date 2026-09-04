import { isMissingCaseStudyApprovalSchema } from '../utils/publicContent'
import { buildSitemapEntries, renderSitemapXml } from '../utils/sitemapDiscovery'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const org = await resolveOrganizationContext(event)
    if (!org?.id) throw new Error('sitemap_organization_unavailable')

    const supabase = getSupabaseAdmin()
    const [articlesResult, initialProjectsResult] = await Promise.all([
      supabase
        .from('articles')
        .select('slug, published_at, updated_at, created_at')
        .eq('organization_id', org.id)
        .eq('published', true),
      supabase
        .from('projects')
        .select('slug, case_study_published_at, updated_at, created_at')
        .eq('organization_id', org.id)
        .eq('case_study_published', true)
        .not('case_study_approved_at', 'is', null),
    ])
    const projectsResult = isMissingCaseStudyApprovalSchema(initialProjectsResult.error)
      ? { data: [], error: null }
      : initialProjectsResult

    if (articlesResult.error || projectsResult.error) {
      throw articlesResult.error || projectsResult.error
    }

    const entries = buildSitemapEntries(
      articlesResult.data ?? [],
      projectsResult.data ?? [],
    )
    const xml = renderSitemapXml(String(config.public.siteUrl || ''), entries)

    setHeader(event, 'content-type', 'application/xml; charset=UTF-8')
    return xml
  }
  catch (error) {
    console.error('[sitemap] unable to build complete sitemap', error)
    throw createError({
      statusCode: 503,
      statusMessage: 'Sitemap temporarily unavailable',
    })
  }
})
