import { validateSocialMediaItems } from '../../../../utils/socialMedia'

export default defineEventHandler(async (event) => {
  const { user, org } = await requireAdmin(event)
  const body = await readJsonBodyLimited(event, MAX_SOCIAL_REQUEST_BYTES)
  const id = getRouterParam(event, 'id')
  const version = validateExpectedVersion(body.version)
  const db = getSupabaseAdmin()
  const { data: current, error: currentError } = await db.from('social_posts').select('platform,status,media_kind')
    .eq('organization_id', org.id).eq('id', id).maybeSingle()
  if (currentError) throw createError({ statusCode: 500, message: 'Le brouillon ne peut pas être chargé.' })
  if (!current) throw createError({ statusCode: 404, message: 'Brouillon introuvable.' })
  if (!['instagram', 'linkedin'].includes(current.platform) || !['draft', 'failed'].includes(current.status) || current.media_kind) {
    throw createError({ statusCode: 409, message: 'Seul un brouillon Instagram ou LinkedIn sans PDF peut recevoir ces médias.' })
  }
  const media = validateSocialMediaItems(body.media, current.platform, String(useRuntimeConfig().public.supabaseUrl || ''))
  const { data, error } = await db.from('social_posts').update({
    media_items: media, media_images: [], publication_mode: 'manual', approved_version: null, approval_fingerprint: null,
    ...(current.platform === 'linkedin' ? { status: 'draft', last_error: null } : {}),
    publish_after: null, version: version + 1, updated_at: new Date().toISOString(),
  }).eq('organization_id', org.id).eq('id', id).eq('version', version).in('status', ['draft', 'failed'])
    .select('id,status,last_error,media_items,media_images,publication_mode,approved_version,approval_fingerprint,publish_after,version,updated_at').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'Les médias n’ont pas été enregistrés.' })
  if (!data) throw createError({ statusCode: 409, message: 'Le brouillon a changé. Actualise la page.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: 'social.post.media.updated', entityType: 'social_post', entityId: id })
  return data
})
