export default defineEventHandler(async (event) => {
  const { user, org } = await requireAdmin(event)
  const body = await readJsonBodyLimited(event, MAX_SOCIAL_REQUEST_BYTES)
  const id = getRouterParam(event, 'id')
  const version = validateExpectedVersion(body.version)
  const mode = validateSocialApprovalMode(body.mode)
  const expectedConfirmation = mode === 'now' ? SOCIAL_PUBLISH_NOW_CONFIRMATION : SOCIAL_SCHEDULE_CONFIRMATION
  if (!id || body.confirmation !== expectedConfirmation) {
    throw createError({ statusCode: 400, message: 'Confirmation explicite requise.' })
  }
  const supabase = getSupabaseAdmin()
  const { data: current } = await supabase.from('social_posts').select('platform,status,publication_mode,article_url,media_images')
    .eq('organization_id', org.id).eq('id', id).maybeSingle()
  if (!current) throw createError({ statusCode: 404, message: 'Brouillon introuvable.' })
  validateAutomaticSocialPost(current)
  if (!['draft', 'failed'].includes(current.status) && !(current.status === 'approved' && current.publication_mode === 'manual')) throw createError({ statusCode: 409, message: 'Statut incompatible.' })
  const content = validateSocialContent(current.platform, body.content)
  if (current.platform !== 'instagram' && !content.includes(current.article_url)) {
    throw createError({ statusCode: 400, message: 'Le texte doit contenir le lien public associé.' })
  }
  // Editorial approval is independent of provider availability. The Hermes
  // publisher checks credentials again before any external write.
  const publishAfter = mode === 'now' ? new Date() : nextSocialPublicationAt()
  const { data: rows, error } = await supabase.rpc('approve_social_post', {
    p_organization_id: org.id, p_post_id: id, p_expected_version: version,
    p_content: content, p_publish_after: publishAfter.toISOString(),
  })
  const data = rows?.[0]
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) throw createError({ statusCode: 409, message: 'Le brouillon a changé. Recharge la page.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: `social.post.approved.${mode}`, entityType: 'social_post', entityId: id })
  return data
})
