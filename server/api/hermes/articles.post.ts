import { createHash } from 'node:crypto'

export default defineEventHandler(async (event) => {
  requireHermesPublishAccess(event)
  const idempotencyKey = validateHermesIdempotencyKey(getHeader(event, 'idempotency-key'))
  const body = await readJsonBodyLimited(event, MAX_HERMES_ARTICLE_REQUEST_BYTES)
  const input = validateHermesArticlePayload(body)
  const image = validateImageDataUrl(input.coverImageDataUrl)

  const config = useRuntimeConfig()
  const organizationSlug = String(config.public.defaultOrganizationSlug || '')
  if (!organizationSlug) {
    throw createError({ statusCode: 500, message: 'Organisation Hermes non configuree.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', organizationSlug)
    .maybeSingle()
  if (organizationError || !organization) {
    throw createError({ statusCode: 500, message: 'Organisation introuvable.' })
  }

  const { data: priorAudit } = await supabase
    .from('audit_logs')
    .select('entity_id,payload')
    .eq('organization_id', organization.id)
    .eq('action', 'hermes.article.created')
    .contains('payload', { idempotency_key: idempotencyKey })
    .limit(1)
    .maybeSingle()

  if (priorAudit?.entity_id) {
    const { data: existing } = await supabase
      .from('articles')
      .select('id,title,slug,excerpt,cover_image,published,published_at')
      .eq('organization_id', organization.id)
      .eq('id', priorAudit.entity_id)
      .maybeSingle()
    if (!existing || existing.slug !== input.slug) {
      throw createError({ statusCode: 409, message: 'Idempotency-Key conflicts with an existing publication' })
    }
    return { article: existing, idempotent: true }
  }

  const { data: slugConflict } = await supabase
    .from('articles')
    .select('id')
    .eq('organization_id', organization.id)
    .eq('slug', input.slug)
    .maybeSingle()
  if (slugConflict) {
    throw createError({ statusCode: 409, message: 'Article slug already exists' })
  }

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket('media')
  if (bucketError || !isStrictMediaBucket(bucket as unknown as Record<string, unknown>)) {
    throw createError({ statusCode: 503, message: 'Media storage is not configured with the required image restrictions' })
  }

  const imageKey = createHash('sha256').update(idempotencyKey).digest('hex')
  const filePath = `hermes/${imageKey}.${image.extension}`
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, image.buffer, { contentType: image.mime, upsert: false })
  if (uploadError) {
    throw createError({ statusCode: 409, message: 'Image for this publication already exists or could not be stored' })
  }
  const { data: publicImage } = supabase.storage.from('media').getPublicUrl(filePath)

  const payload = articlePayload({
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    content: input.content,
    coverImage: publicImage.publicUrl,
    published: true,
    tags: input.tags,
    readTime: input.readTime,
  })
  const { data: article, error: articleError } = await supabase
    .rpc('save_article_with_publication_audit', {
      p_organization_id: organization.id,
      p_article_id: null,
      p_actor_user_id: null,
      p_actor_role: 'owner',
      p_payload: payload,
    })
  if (articleError) throw articlePublicationRpcError(articleError)

  const { error: auditError } = await supabase.from('audit_logs').insert({
    organization_id: organization.id,
    actor_user_id: null,
    action: 'hermes.article.created',
    entity_type: 'article',
    entity_id: String(article.id),
    payload: {
      idempotency_key: idempotencyKey,
      source_urls: input.sourceUrls,
      cover_image_path: filePath,
    },
  })
  if (auditError) {
    console.error('[hermes-articles] Publication created but Hermes audit metadata failed', auditError)
  }

  return { article, idempotent: false }
})
