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
  const { data: current } = await supabase.from('social_posts').select('platform,status,article_url')
    .eq('organization_id', org.id).eq('id', id).maybeSingle()
  if (!current) throw createError({ statusCode: 404, message: 'Brouillon introuvable.' })
  if (!['draft', 'failed'].includes(current.status)) throw createError({ statusCode: 409, message: 'Statut incompatible.' })
  const content = validateSocialContent(current.platform, body.content)
  if (!content.includes(current.article_url)) {
    throw createError({ statusCode: 400, message: 'Le texte doit contenir le lien public associé.' })
  }
  // Editorial approval is independent of provider availability. The Hermes
  // publisher checks credentials again before any external write.
  const publishAfter = mode === 'now' ? new Date() : nextSocialPublicationAt()
  const { data, error } = await supabase.from('social_posts').update({
    content, status: 'approved', publish_after: publishAfter.toISOString(), version: version + 1,
    updated_at: new Date().toISOString(), last_error: null,
  }).eq('organization_id', org.id).eq('id', id).eq('version', version)
    .select('id,status,publish_after,version,updated_at').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) throw createError({ statusCode: 409, message: 'Le brouillon a changé. Recharge la page.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: `social.post.approved.${mode}`, entityType: 'social_post', entityId: id })
  return data
})
