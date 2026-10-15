export default defineEventHandler(async (event) => {
  requireHermesPublishAccess(event)
  const organization = await resolveHermesOrganization()
  const { data, error } = await getSupabaseAdmin().from('social_posts')
    .select('id,organization_id,platform,article_title,article_url,content,media_kind,media_url,media_title,media_images,publication_mode,approval_fingerprint,approved_version,version')
    .eq('organization_id', organization.id).eq('status', 'approved')
    .in('platform', ['linkedin', 'x', 'instagram']).eq('publication_mode', 'automatic')
    .lte('publish_after', new Date().toISOString())
    .order('created_at', { ascending: true }).limit(10)
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { posts: data || [] }
})
