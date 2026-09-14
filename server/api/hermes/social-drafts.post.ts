export default defineEventHandler(async (event) => {
  requireHermesPublishAccess(event)
  const body = await readJsonBodyLimited(event, MAX_SOCIAL_REQUEST_BYTES)
  const input = validateSocialDraftInput(body)
  const organization = await resolveHermesOrganization()
  const supabase = getSupabaseAdmin()

  const { data: existing, error: existingError } = await supabase
    .from('social_posts')
    .select('id,status,version')
    .eq('organization_id', organization.id)
    .eq('platform', input.platform)
    .eq('source_key', input.sourceKey)
    .maybeSingle()
  if (existingError) throw createError({ statusCode: 500, message: existingError.message })
  if (existing?.status === 'published' || existing?.status === 'publishing') {
    return { post: existing, idempotent: true }
  }

  const record = {
    organization_id: organization.id,
    platform: input.platform,
    source_key: input.sourceKey,
    article_title: input.articleTitle,
    article_url: input.articleUrl,
    content: input.content,
    source_path: input.sourcePath,
    status: existing?.status === 'rejected' ? 'rejected' : 'draft',
    version: existing ? existing.version + 1 : 1,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from('social_posts').upsert(record, {
    onConflict: 'organization_id,platform,source_key',
  }).select('id,platform,status,version').single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { post: data, idempotent: Boolean(existing) }
})
