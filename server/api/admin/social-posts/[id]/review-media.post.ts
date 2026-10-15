export default defineEventHandler(async (event) => {
  const { user, org } = await requireAdmin(event)
  const body = await readJsonBodyLimited(event, MAX_SOCIAL_REQUEST_BYTES)
  const id = getRouterParam(event, 'id')
  const version = validateExpectedVersion(body.version)
  if (!id || body.confirmation !== SOCIAL_MEDIA_REVIEW_CONFIRMATION) {
    throw createError({ statusCode: 400, message: 'Confirmation explicite de la relecture des textes et visuels requise.' })
  }
  const db = getSupabaseAdmin()
  const { data: current } = await db.from('social_posts').select('platform,media_images')
    .eq('organization_id', org.id).eq('id', id).maybeSingle()
  if (!current?.media_images?.length) throw createError({ statusCode: 409, message: 'Aucun visuel à valider.' })
  const content = validateSocialContent(current.platform, body.content)
  const { data, error } = await db.from('social_posts').update({
    content, status: 'approved', publish_after: null, last_error: null,
    version: version + 1, updated_at: new Date().toISOString(),
  }).eq('organization_id', org.id).eq('id', id).in('status', ['draft', 'failed']).eq('version', version)
    .select('id,content,status,publish_after,version,updated_at').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'La relecture n’a pas été enregistrée.' })
  if (!data) throw createError({ statusCode: 409, message: 'Le brouillon a changé. Actualise la page.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: 'social.post.media.reviewed', entityType: 'social_post', entityId: id })
  return data
})
