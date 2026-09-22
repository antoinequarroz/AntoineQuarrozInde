export default defineEventHandler(async (event) => {
  requireHermesPublishAccess(event)
  const organization = await resolveHermesOrganization()
  const { data, error } = await getSupabaseAdmin().from('social_posts')
    .select('id,platform,article_title,article_url,content,version')
    .eq('organization_id', organization.id).eq('status', 'approved')
    .lte('publish_after', new Date().toISOString())
    .order('created_at', { ascending: true }).limit(10)
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { posts: data || [] }
})
