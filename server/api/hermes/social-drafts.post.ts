export default defineEventHandler(async (event) => {
  requireHermesPublishAccess(event)
  const body = await readJsonBodyLimited(event, MAX_SOCIAL_REQUEST_BYTES)
  const input = validateSocialDraftInput(body)
  const organization = await resolveHermesOrganization()
  const supabase = getSupabaseAdmin()

  const { data: existing, error: existingError } = await supabase
    .from('social_posts')
    .select('id,platform,status,version,media_kind,media_url,media_title')
    .eq('organization_id', organization.id)
    .eq('platform', input.platform)
    .eq('source_key', input.sourceKey)
    .maybeSingle()
  if (existingError) throw createError({ statusCode: 500, message: existingError.message })
  // A daily retry must never replace an editor's changes or undo approval.
  if (existing) {
    // A draft created before its document was ready may receive that attachment,
    // while its reviewed copy and workflow state remain untouched.
    if (existing.status === 'draft' && input.mediaKind && !existing.media_url) {
      const { data, error } = await supabase.from('social_posts').update({
        media_kind: input.mediaKind,
        media_url: input.mediaUrl,
        media_title: input.mediaTitle,
        version: existing.version + 1,
        updated_at: new Date().toISOString(),
      }).eq('organization_id', organization.id).eq('id', existing.id).eq('status', 'draft').eq('version', existing.version)
        .select('id,platform,status,version,media_kind,media_url,media_title').maybeSingle()
      if (error) throw createError({ statusCode: 500, message: error.message })
      if (data) return { post: data, idempotent: false, enriched: true }
    }
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
    media_kind: input.mediaKind,
    media_url: input.mediaUrl,
    media_title: input.mediaTitle,
    status: 'draft',
    version: 1,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from('social_posts').insert(record)
    .select('id,platform,status,version,media_kind,media_url,media_title').single()
  if (error?.code === '23505') {
    const { data: concurrent, error: readError } = await supabase
      .from('social_posts')
      .select('id,status,version')
      .eq('organization_id', organization.id)
      .eq('platform', input.platform)
      .eq('source_key', input.sourceKey)
      .single()
    if (readError) throw createError({ statusCode: 500, message: readError.message })
    return { post: concurrent, idempotent: true }
  }
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { post: data, idempotent: false }
})
