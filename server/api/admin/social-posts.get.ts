import { parseSocialPostListQuery, socialPostSearchFilter } from '../../utils/socialEditorial'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const query = parseSocialPostListQuery(getQuery(event))
  const supabase = getSupabaseAdmin()
  let postQuery = supabase.from('social_posts')
    .select('id,platform,source_key,article_title,article_url,content,media_kind,media_url,media_title,media_images,media_items,publication_mode,approved_version,status,external_post_url,last_error,planned_at,publish_after,published_at,version,created_at,updated_at', { count: 'exact' })
    .eq('organization_id', org.id)
  if (query.platform) postQuery = postQuery.eq('platform', query.platform)
  if (query.statuses) postQuery = postQuery.in('status', [...query.statuses])
  if (query.search) postQuery = postQuery.or(socialPostSearchFilter(query.search))
  const [posts, connections] = await Promise.all([
    postQuery
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(query.offset, query.offset + query.pageSize - 1),
    supabase.from('social_platform_connections')
      .select('platform,state,message,checked_at,last_success_at')
      .eq('organization_id', org.id),
  ])
  if (posts.error || connections.error) {
    throw createError({ statusCode: 500, message: posts.error?.message || connections.error?.message })
  }
  return {
    posts: (posts.data || []).map(({ source_key, ...post }) => ({ ...post, studioContentId: studioInstagramContentId(source_key) })),
    connections: connections.data || [],
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: posts.count ?? 0,
      totalPages: Math.max(1, Math.ceil((posts.count ?? 0) / query.pageSize)),
      hasMore: query.offset + (posts.data?.length ?? 0) < (posts.count ?? 0),
    },
  }
})
