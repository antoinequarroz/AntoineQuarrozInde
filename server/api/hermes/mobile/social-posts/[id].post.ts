import { requireHermesMobileDevice } from '../../../../utils/hermesMobileDevice'
import {
  MAX_SOCIAL_REQUEST_BYTES,
  SOCIAL_PUBLISH_NOW_CONFIRMATION,
  SOCIAL_SCHEDULE_CONFIRMATION,
  nextSocialPublicationAt,
  validateExpectedVersion,
  validateSocialContent,
} from '../../../../utils/socialPublication'

const ALLOWED_ACTIONS = ['save', 'reject', 'approve_scheduled', 'approve_now'] as const
type Action = typeof ALLOWED_ACTIONS[number]

export default defineEventHandler(async (event) => {
  const device = await requireHermesMobileDevice(event)
  const body = await readJsonBodyLimited(event, MAX_SOCIAL_REQUEST_BYTES)
  const id = getRouterParam(event, 'id') || ''
  const action = String(body.action || '') as Action
  const version = validateExpectedVersion(body.version)
  if (!/^[0-9a-f-]{36}$/i.test(id) || !ALLOWED_ACTIONS.includes(action)) {
    throw createError({ statusCode: 400, message: 'Action de publication invalide.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: current, error: currentError } = await supabase.from('social_posts')
    .select('platform,status,article_url')
    .eq('organization_id', device.organization_id).eq('id', id).maybeSingle()
  if (currentError) throw createError({ statusCode: 500, message: 'Publication indisponible.' })
  if (!current) throw createError({ statusCode: 404, message: 'Brouillon introuvable.' })
  if (!['draft', 'failed'].includes(current.status)) {
    throw createError({ statusCode: 409, message: 'Cette version ne peut plus être modifiée.' })
  }

  const content = validateSocialContent(current.platform, body.content)
  if ((action === 'approve_scheduled' || action === 'approve_now') && !content.includes(current.article_url)) {
    throw createError({ statusCode: 400, message: 'Le texte doit contenir le lien public associé.' })
  }
  if (action === 'approve_scheduled' && body.confirmation !== SOCIAL_SCHEDULE_CONFIRMATION) {
    throw createError({ statusCode: 400, message: 'Confirmation explicite requise pour programmer.' })
  }
  if (action === 'approve_now' && body.confirmation !== SOCIAL_PUBLISH_NOW_CONFIRMATION) {
    throw createError({ statusCode: 400, message: 'Confirmation explicite requise pour publier maintenant.' })
  }

  const updates: Record<string, unknown> = {
    content,
    version: version + 1,
    updated_at: new Date().toISOString(),
  }
  if (action === 'reject') {
    updates.status = 'rejected'
    updates.publish_after = null
  }
  if (action === 'approve_scheduled' || action === 'approve_now') {
    updates.status = 'approved'
    updates.publish_after = (action === 'approve_now' ? new Date() : nextSocialPublicationAt()).toISOString()
    updates.last_error = null
  }

  const { data, error } = await supabase.from('social_posts').update(updates)
    .eq('organization_id', device.organization_id).eq('id', id).eq('version', version)
    .select('id,content,status,publish_after,version,updated_at').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'La publication n’a pas été mise à jour.' })
  if (!data) throw createError({ statusCode: 409, message: 'Le brouillon a changé. Actualise avant de continuer.' })

  await logAudit({
    organizationId: device.organization_id,
    actorUserId: null,
    action: `social.post.cockpit.${action}`,
    entityType: 'social_post',
    entityId: id,
    payload: { device_id: device.id },
  })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return data
})
