import { isInstagramReelMedia, isLinkedInVideoPost, supportsInstagramMixed, supportsInstagramReels } from '../../utils/socialMedia'

export default defineEventHandler(async (event) => {
  requireHermesPublishAccess(event)
  const organization = await resolveHermesOrganization()
  let query = getSupabaseAdmin().from('social_posts')
    .select('id,organization_id,platform,article_title,article_url,content,media_kind,media_url,media_title,media_images,media_items,publication_mode,approval_fingerprint,approved_version,version')
    .eq('organization_id', organization.id).eq('status', 'approved')
    .in('platform', ['linkedin', 'x', 'instagram']).eq('publication_mode', 'automatic')
    .lte('publish_after', new Date().toISOString())
  // An older publisher must never claim only the image subset of a carousel.
  if (!supportsInstagramMixed(event)) query = query.eq('media_items', '[]')
  else if (!supportsInstagramReels(event)) {
    // Filter before limiting the queue so pending Reels cannot starve a
    // carousel-only runner. Valid shapes are empty, one video, or 2–10 items.
    query = query.or('media_items.eq.[],and(platform.eq.instagram,media_items->1.not.is.null)')
  } else {
    // LinkedIn videos have a manual review flow, independently of an
    // Instagram runner's declared capabilities. Filter before the limit.
    query = query.or('media_items.eq.[],platform.eq.instagram')
  }
  const { data, error } = await query.order('created_at', { ascending: true }).limit(10)
  if (error) throw createError({ statusCode: 500, message: error.message })
  // Mixed-carousel capability does not imply support for a standalone Reel.
  // Older runners must never claim it as a one-item carousel.
  return { posts: (data || []).filter(post => !isLinkedInVideoPost(post)
    && (supportsInstagramReels(event) || !isInstagramReelMedia(post.media_items))) }
})
