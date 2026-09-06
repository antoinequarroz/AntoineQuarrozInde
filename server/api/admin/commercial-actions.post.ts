import { isCommercialActionStatus } from '../../../app/utils/commercialActionState'

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const actionKey = typeof body?.actionKey === 'string' ? body.actionKey.trim() : ''
  const status = body?.status
  const snoozedUntil = typeof body?.snoozedUntil === 'string' ? body.snoozedUntil : null
  const targetPath = typeof body?.targetPath === 'string' ? body.targetPath.trim() : ''

  if (!actionKey || actionKey.length > 160 || !/^[a-z]+:[A-Za-z0-9_-]+$/.test(actionKey)) {
    throw createError({ statusCode: 400, message: 'Action commerciale invalide.' })
  }
  if (!isCommercialActionStatus(status)) {
    throw createError({ statusCode: 400, message: 'Statut commercial invalide.' })
  }
  if (status === 'snoozed' && (!snoozedUntil || !isoDatePattern.test(snoozedUntil))) {
    throw createError({ statusCode: 400, message: 'Une date de report valide est requise.' })
  }
  if (targetPath.length > 500 || (targetPath && !targetPath.startsWith('/admin/'))) {
    throw createError({ statusCode: 400, message: 'Destination invalide.' })
  }

  const payload = {
    actionKey,
    status,
    snoozedUntil: status === 'snoozed' ? snoozedUntil : null,
    targetPath: targetPath || null,
  }
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      organization_id: org.id,
      actor_user_id: user?.id || null,
      action: 'commercial_action.state_changed',
      entity_type: 'commercial_action',
      entity_id: actionKey,
      payload,
    })
    .select('created_at')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { ...payload, updatedAt: data.created_at }
})
