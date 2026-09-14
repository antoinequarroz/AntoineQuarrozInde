export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const [posts, connections] = await Promise.all([
    supabase.from('social_posts')
      .select('id,platform,article_title,article_url,content,status,external_post_url,last_error,published_at,version,created_at,updated_at')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('social_platform_connections')
      .select('platform,state,message,checked_at,last_success_at')
      .eq('organization_id', org.id),
  ])
  if (posts.error || connections.error) {
    throw createError({ statusCode: 500, message: posts.error?.message || connections.error?.message })
  }
  return { posts: posts.data || [], connections: connections.data || [] }
})
