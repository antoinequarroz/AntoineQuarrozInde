import { createHash } from 'node:crypto'

export default defineEventHandler(async (event) => {
  requireHermesPublishAccess(event)
  const idempotencyKey = validateHermesIdempotencyKey(getHeader(event, 'idempotency-key'))
  const body = await readJsonBodyLimited(event, MAX_HERMES_ARTICLE_REQUEST_BYTES)
  const input = validateHermesCoverUpdatePayload(body)
  const image = validateImageDataUrl(input.coverImageDataUrl)

  const ratio = image.width / image.height
  if (image.width < 900 || image.height < 500 || Math.abs(ratio - (16 / 9)) > 0.02) {
    throw createError({ statusCode: 400, message: 'Editorial covers must be horizontal 16:9 and at least 900 pixels wide' })
  }

  const config = useRuntimeConfig()
  const organizationSlug = String(config.public.defaultOrganizationSlug || '')
  if (!organizationSlug) throw createError({ statusCode: 500, message: 'Organisation Hermes non configuree.' })

  const supabase = getSupabaseAdmin()
  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', organizationSlug)
    .maybeSingle()
  if (organizationError || !organization) throw createError({ statusCode: 500, message: 'Organisation introuvable.' })

  const { data: existing, error: existingError } = await supabase
    .from('articles')
    .select('id,title,slug,cover_image,published')
    .eq('organization_id', organization.id)
    .eq('id', input.articleId)
    .maybeSingle()
  if (existingError) throw createError({ statusCode: 500, message: 'Article lookup failed' })
  if (!existing) throw createError({ statusCode: 404, message: 'Article not found' })

  const { data: priorAudit } = await supabase
    .from('audit_logs')
    .select('entity_id,payload')
    .eq('organization_id', organization.id)
    .eq('action', 'hermes.article.cover_updated')
    .contains('payload', { idempotency_key: idempotencyKey })
    .limit(1)
    .maybeSingle()
  if (priorAudit?.entity_id) {
    if (String(priorAudit.entity_id) !== String(existing.id)) {
      throw createError({ statusCode: 409, message: 'Idempotency-Key conflicts with another article' })
    }
    return { article: existing, idempotent: true }
  }

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket('media')
  if (bucketError || !isStrictMediaBucket(bucket as unknown as Record<string, unknown>)) {
    throw createError({ statusCode: 503, message: 'Media storage is not configured with the required image restrictions' })
  }

  const imageHash = createHash('sha256').update(image.buffer).digest('hex')
  const filePath = `hermes/covers/article-${existing.id}-${imageHash}.${image.extension}`
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, image.buffer, { contentType: image.mime, upsert: false })
  if (uploadError) throw createError({ statusCode: 409, message: 'Cover image already exists or could not be stored' })

  const { data: publicImage } = supabase.storage.from('media').getPublicUrl(filePath)
  const { data: article, error: updateError } = await supabase
    .from('articles')
    .update({ cover_image: publicImage.publicUrl, updated_at: new Date().toISOString() })
    .eq('organization_id', organization.id)
    .eq('id', existing.id)
    .select('id,title,slug,cover_image,published,updated_at')
    .single()
  if (updateError) throw createError({ statusCode: 500, message: 'Cover update failed' })

  const { error: auditError } = await supabase.from('audit_logs').insert({
    organization_id: organization.id,
    actor_user_id: null,
    action: 'hermes.article.cover_updated',
    entity_type: 'article',
    entity_id: String(article.id),
    payload: {
      idempotency_key: idempotencyKey,
      cover_image_path: filePath,
      cover_style: input.coverStyle,
      previous_cover_image: existing.cover_image,
    },
  })
  if (auditError) console.error('[hermes-articles] Cover updated but audit metadata failed', auditError)

  return { article, idempotent: false }
})
