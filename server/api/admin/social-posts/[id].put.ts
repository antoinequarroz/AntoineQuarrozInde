export default defineEventHandler(async (event) => {
  const { user, org } = await requireAdmin(event)
  const body = await readJsonBodyLimited(event, MAX_SOCIAL_REQUEST_BYTES)
  const id = getRouterParam(event, 'id')
  const version = validateExpectedVersion(body.version)
  const action = body.action
  if (!id || !['save', 'reject', 'restore'].includes(String(action))) {
    throw createError({ statusCode: 400, message: 'Action invalide.' })
  }
  const supabase = getSupabaseAdmin()
  const { data: current, error: currentError } = await supabase.from('social_posts')
    .select('platform,status').eq('organization_id', org.id).eq('id', id).maybeSingle()
  if (currentError) throw createError({ statusCode: 500, message: currentError.message })
  if (!current) throw createError({ statusCode: 404, message: 'Brouillon introuvable.' })
  if (['publishing', 'published'].includes(current.status)) {
    throw createError({ statusCode: 409, message: 'Cette publication ne peut plus être modifiée.' })
  }

  const updates: Record<string, unknown> = { version: version + 1, updated_at: new Date().toISOString() }
  if (action === 'save') updates.content = validateSocialContent(current.platform, body.content)
  if (action === 'reject') updates.status = 'rejected'
  if (action === 'restore') updates.status = 'draft'
  const { data, error } = await supabase.from('social_posts').update(updates)
    .eq('organization_id', org.id).eq('id', id).eq('version', version)
    .select('id,content,status,version,updated_at').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) throw createError({ statusCode: 409, message: 'Le brouillon a changé. Recharge la page.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: `social.post.${action}`, entityType: 'social_post', entityId: id })
  return data
})
