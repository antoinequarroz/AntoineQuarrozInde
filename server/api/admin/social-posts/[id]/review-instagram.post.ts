export default defineEventHandler(async (event) => {
  const { user, org } = await requireAdmin(event)
  const body = await readJsonBodyLimited(event, MAX_SOCIAL_REQUEST_BYTES)
  const id = getRouterParam(event, 'id')
  const version = validateExpectedVersion(body.version)
  if (!id || body.confirmation !== SOCIAL_INSTAGRAM_REVIEW_CONFIRMATION) {
    throw createError({ statusCode: 400, message: 'Confirmation explicite de la relecture requise.' })
  }
  const content = validateSocialContent('instagram', body.content)
  const { data, error } = await getSupabaseAdmin().from('social_posts').update({
    content, status: 'approved', publication_mode: 'manual', approved_version: null, approval_fingerprint: null, publish_after: null, last_error: null,
    version: version + 1, updated_at: new Date().toISOString(),
  }).eq('organization_id', org.id).eq('id', id).eq('platform', 'instagram').eq('media_images', '[]').eq('media_items', '[]')
    .in('status', ['draft', 'failed']).eq('version', version)
    .select('id,content,status,publish_after,version,updated_at').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'La relecture n’a pas été enregistrée.' })
  if (!data) throw createError({ statusCode: 409, message: 'Le brouillon est introuvable ou a changé. Actualise la page.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: 'social.post.instagram.text_reviewed', entityType: 'social_post', entityId: id })
  return data
})
