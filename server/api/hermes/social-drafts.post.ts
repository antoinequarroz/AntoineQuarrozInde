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
  // A daily retry must never replace an editor's changes or undo approval.
  if (existing) {
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
    status: 'draft',
    version: 1,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from('social_posts').insert(record)
    .select('id,platform,status,version').single()
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
