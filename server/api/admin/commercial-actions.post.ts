import { isCommercialActionStatus } from '../../../app/utils/commercialActionState'
import { parseCommercialActionTarget } from '../../utils/commercialActionTarget'
import { runCompensatedTransition, TransitionCompensationError, TransitionConflictError } from '../../utils/compensatedTransition'

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

  const supabase = getSupabaseAdmin()
  const target = parseCommercialActionTarget(actionKey)
  const aliasActionKey = target?.kind === 'lead' && target.occurrenceDate && status === 'ignored'
    ? `lead:${target.sourceId}`
    : null
  const payload: Record<string, unknown> = {
    actionKey,
    aliasActionKey,
    status,
    snoozedUntil: status === 'snoozed' ? snoozedUntil : null,
    targetPath: targetPath || null,
  }
  let clientId: number | null = null
  let currentLeadLastContactedAt: string | null = null
  if (target) {
    const { data: targetRow, error: targetError } = await supabase
      .from(target.table)
      .select(target.kind === 'lead' ? 'id,last_contacted_at' : target.clientColumn)
      .eq('organization_id', org.id)
      .eq('id', target.sourceId)
      .maybeSingle()
    if (targetError) throw createError({ statusCode: 500, message: targetError.message })
    const resolvedClientId = (targetRow as Record<string, unknown> | null)?.[target.clientColumn]
    clientId = Number.isSafeInteger(Number(resolvedClientId)) && Number(resolvedClientId) > 0
      ? Number(resolvedClientId)
      : null
    if (target.kind === 'lead') {
      const value = (targetRow as Record<string, unknown> | null)?.last_contacted_at
      currentLeadLastContactedAt = typeof value === 'string' ? value : null
    }
  }

  let leadTransition: {
    expectedDate: string | null
    nextDate: string | null
    expectedLastContactedAt: string | null
    nextLastContactedAt: string | null
  } | null = null
  if (target?.kind === 'lead' && target.occurrenceDate) {
    let expectedDate: string | null = target.occurrenceDate
    let expectedLastContactedAt = currentLeadLastContactedAt
    const nextDate = status === 'snoozed'
      ? snoozedUntil
      : status === 'restored'
        ? target.occurrenceDate
        : null
    let nextLastContactedAt = status === 'handled' ? new Date().toISOString() : currentLeadLastContactedAt

    if (status === 'restored') {
      const { data: previousDecision, error: previousDecisionError } = await supabase
        .from('audit_logs')
        .select('payload,created_at')
        .eq('organization_id', org.id)
        .eq('action', 'commercial_action.state_changed')
        .eq('entity_id', actionKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (previousDecisionError) throw createError({ statusCode: 500, message: previousDecisionError.message })
      const previousPayload = previousDecision?.payload as Record<string, unknown> | null
      if (previousPayload?.status === 'restored') {
        return { ...previousPayload, updatedAt: previousDecision?.created_at || new Date().toISOString(), alreadyRestored: true }
      }
      if (!previousPayload || !['handled', 'snoozed', 'ignored'].includes(String(previousPayload.status))) {
        throw createError({ statusCode: 409, message: 'Cette décision commerciale ne peut plus être restaurée.' })
      }
      expectedDate = previousPayload?.status === 'snoozed' && typeof previousPayload.snoozedUntil === 'string'
        ? previousPayload.snoozedUntil
        : previousPayload?.status === 'handled' || previousPayload?.status === 'ignored'
          ? null
          : target.occurrenceDate
      expectedLastContactedAt = typeof previousPayload?.nextLastContactedAt === 'string'
        ? previousPayload.nextLastContactedAt
        : currentLeadLastContactedAt
      nextLastContactedAt = typeof previousPayload?.previousLastContactedAt === 'string'
        ? previousPayload.previousLastContactedAt
        : previousPayload?.previousLastContactedAt === null
          ? null
          : currentLeadLastContactedAt
    }

    leadTransition = { expectedDate, nextDate, expectedLastContactedAt, nextLastContactedAt }
    payload.previousLastContactedAt = expectedLastContactedAt
    payload.nextLastContactedAt = nextLastContactedAt
  }

  const writeAudit = async () => {
    const { data, error } = await supabase.from('audit_logs').insert({
      organization_id: org.id,
      actor_user_id: user?.id || null,
      action: 'commercial_action.state_changed',
      entity_type: 'commercial_action',
      entity_id: actionKey,
      client_id: clientId,
      payload,
    }).select('created_at').single()
    if (error) throw new Error(error.message)
    return data.created_at
  }

  const updateLeadState = async (
    nextDate: string | null,
    expectedDate: string | null,
    nextLastContactedAt: string | null,
    expectedLastContactedAt: string | null,
  ) => {
    if (target?.kind !== 'lead') return false
    let query = supabase
      .from('clients')
      .update({ next_follow_up_at: nextDate, last_contacted_at: nextLastContactedAt })
      .eq('organization_id', org.id)
      .eq('id', target.sourceId)
      .eq('status', 'lead')
    query = expectedDate === null ? query.is('next_follow_up_at', null) : query.eq('next_follow_up_at', expectedDate)
    query = expectedLastContactedAt === null ? query.is('last_contacted_at', null) : query.eq('last_contacted_at', expectedLastContactedAt)
    const { data, error } = await query.select('id').maybeSingle()
    if (error) throw new Error(error.message)
    return Boolean(data)
  }

  let updatedAt: string
  try {
    updatedAt = leadTransition
      ? await runCompensatedTransition({
          apply: () => updateLeadState(leadTransition.nextDate, leadTransition.expectedDate, leadTransition.nextLastContactedAt, leadTransition.expectedLastContactedAt),
          commit: writeAudit,
          compensate: () => updateLeadState(leadTransition.expectedDate, leadTransition.nextDate, leadTransition.expectedLastContactedAt, leadTransition.nextLastContactedAt),
        })
      : await writeAudit()
  }
  catch (error) {
    if (error instanceof TransitionConflictError) {
      throw createError({ statusCode: 409, message: 'La relance prospect a changé. Recharge le CRM avant de réessayer.' })
    }
    if (error instanceof TransitionCompensationError) {
      throw createError({ statusCode: 500, message: 'La relance n’a pas pu être journalisée ni restaurée. Recharge le CRM avant toute nouvelle action.' })
    }
    throw createError({ statusCode: 500, message: error instanceof Error ? error.message : 'Journal commercial indisponible.' })
  }

  return { ...payload, updatedAt }
})
