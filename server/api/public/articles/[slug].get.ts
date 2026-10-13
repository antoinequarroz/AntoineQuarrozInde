import { resolveCanonicalPublicOrganizationId } from '../../../utils/publicOrganization'

const PREVIEW_COLUMNS = 'slug,title,excerpt,content'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug || slug.length > 200) {
    throw createError({ statusCode: 404, statusMessage: 'Article non trouvé.' })
  }

  let article: { slug: string, title: string, excerpt: string, content: string } | null
  try {
    const organizationId = await resolveCanonicalPublicOrganizationId()
    if (!organizationId) throw new Error('Canonical public organization not found')

    const { data, error } = await getSupabaseAdmin()
      .from('articles')
      .select(PREVIEW_COLUMNS)
      .eq('organization_id', organizationId)
      .eq('published', true)
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw error
    article = data ? {
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
    } : null
  }
  catch (error) {
    console.error('[public-article-preview] Article unavailable', error)
    throw createError({ statusCode: 503, statusMessage: 'L’article est temporairement indisponible.' })
  }

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Article non trouvé.' })
  }
  return article
})
