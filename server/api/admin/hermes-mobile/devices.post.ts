import { createHermesMobileToken, hashHermesMobileToken } from '../../../utils/hermesMobile'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  if (!['owner', 'admin'].includes(org.role)) throw createError({ statusCode: 403, message: 'Accès réservé à l’administrateur.' })
  const body = await readJsonBodyLimited(event, 1024)
  const label = typeof body.label === 'string' ? body.label.trim() : ''
  if (!label || label.length > 80) throw createError({ statusCode: 400, message: 'Nom de l’appareil invalide.' })
  const supabase = getSupabaseAdmin()
  const token = createHermesMobileToken()
  const { error: revokeError } = await supabase.from('hermes_mobile_devices')
    .update({ revoked_at: new Date().toISOString() }).eq('organization_id', org.id).is('revoked_at', null)
  if (revokeError) throw createError({ statusCode: 500, message: 'Ancien appareil non révoqué.' })
  const { data, error } = await supabase.from('hermes_mobile_devices').insert({
    organization_id: org.id, label, token_hash: hashHermesMobileToken(token),
  }).select('id,label,created_at').single()
  if (error) throw createError({ statusCode: 500, message: 'Appareil non créé.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: 'hermes.mobile.device.created', entityType: 'hermes_mobile_device', entityId: data.id })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { device: data, token }
})
