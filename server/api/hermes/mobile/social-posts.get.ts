import { requireHermesMobileDevice } from '../../../utils/hermesMobileDevice'

export default defineEventHandler(async (event) => {
  const device = await requireHermesMobileDevice(event)
  const supabase = getSupabaseAdmin()
  const [posts, connections] = await Promise.all([
    supabase.from('social_posts')
      .select('id,platform,article_title,article_url,content,media_kind,media_url,media_title,status,external_post_url,last_error,publish_after,published_at,version,created_at,updated_at')
      .eq('organization_id', device.organization_id)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('social_platform_connections')
      .select('platform,state,message,checked_at,last_success_at')
      .eq('organization_id', device.organization_id),
  ])
  if (posts.error || connections.error) {
    throw createError({ statusCode: 500, message: 'Le centre de publications est indisponible.' })
  }
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { schemaVersion: 1, posts: posts.data || [], connections: connections.data || [] }
})
