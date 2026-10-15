export default defineEventHandler(async (event) => {
  const { user, org } = await requireAdmin(event)
  const body = await readJsonBodyLimited(event, MAX_SOCIAL_REQUEST_BYTES)
  const id = getRouterParam(event, 'id')
  const version = validateExpectedVersion(body.version)
  const db = getSupabaseAdmin()
  const { data: current } = await db.from('social_posts').select('platform,status,media_kind')
    .eq('organization_id', org.id).eq('id', id).maybeSingle()
  if (!current) throw createError({ statusCode: 404, message: 'Brouillon introuvable.' })
  if (!['draft', 'failed'].includes(current.status) || current.media_kind) {
    throw createError({ statusCode: 409, message: 'Seul un brouillon sans document PDF peut recevoir des images.' })
  }
  const images = validateSocialImages(body.images, current.platform, String(useRuntimeConfig().public.supabaseUrl || ''))
  const { data, error } = await db.from('social_posts').update({
    media_images: images, version: version + 1, updated_at: new Date().toISOString(),
  }).eq('organization_id', org.id).eq('id', id).eq('version', version).in('status', ['draft', 'failed'])
    .select('id,media_images,version,updated_at').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'Les visuels n’ont pas été enregistrés.' })
  if (!data) throw createError({ statusCode: 409, message: 'Le brouillon a changé. Actualise la page.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: 'social.post.images.updated', entityType: 'social_post', entityId: id })
  return data
})
