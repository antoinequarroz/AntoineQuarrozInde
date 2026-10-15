import { supportsInstagramMixed } from '../../utils/socialMedia'

export default defineEventHandler(async (event) => {
  requireHermesPublishAccess(event)
  const organization = await resolveHermesOrganization()
  let query = getSupabaseAdmin().from('social_posts')
    .select('id,organization_id,platform,article_title,article_url,content,media_kind,media_url,media_title,media_images,media_items,publication_mode,approval_fingerprint,approved_version,version')
    .eq('organization_id', organization.id).eq('status', 'approved')
    .in('platform', ['linkedin', 'x', 'instagram']).eq('publication_mode', 'automatic')
    .lte('publish_after', new Date().toISOString())
    .order('created_at', { ascending: true }).limit(10)
  // An older publisher must never claim only the image subset of a carousel.
  if (!supportsInstagramMixed(event)) query = query.eq('media_items', '[]')
  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { posts: data || [] }
})
