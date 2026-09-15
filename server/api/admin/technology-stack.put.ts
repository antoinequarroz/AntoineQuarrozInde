import { cloneDefaultTechnologyStack } from '../../../shared/utils/technologyStack'
import {
  parseExpectedRevision,
  parseTechnologyStackRequest,
  requireTechnologyStackEditor,
  serializeTechnologyStackSettings,
  TECHNOLOGY_STACK_COLUMNS,
} from '../../utils/technologyStack'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  requireTechnologyStackEditor(org)
  const body = await readBody(event)
  const items = parseTechnologyStackRequest(body?.items)
  const expectedRevision = parseExpectedRevision(body?.expectedRevision)
  const supabase = getSupabaseAdmin()
  const updatedAt = new Date().toISOString()

  let result: { data: any, error: any }
  if (expectedRevision === 0) {
    result = await supabase
      .from('technology_stack_settings')
      .insert({
        organization_id: org.id,
        draft_items: items,
        published_items: cloneDefaultTechnologyStack(),
        draft_revision: 1,
        published_revision: 1,
        updated_at: updatedAt,
        published_at: updatedAt,
      })
      .select(TECHNOLOGY_STACK_COLUMNS)
      .maybeSingle()
  }
  else {
    result = await supabase
      .from('technology_stack_settings')
      .update({
        draft_items: items,
        draft_revision: expectedRevision + 1,
        updated_at: updatedAt,
      })
      .eq('organization_id', org.id)
      .eq('draft_revision', expectedRevision)
      .select(TECHNOLOGY_STACK_COLUMNS)
      .maybeSingle()
  }

  if (result.error?.code === '23505' || (!result.error && !result.data)) {
    throw createError({ statusCode: 409, message: 'La stack a changé dans une autre session. Recharge la page avant de recommencer.' })
  }
  if (result.error) {
    throw createError({ statusCode: 500, message: 'Impossible d’enregistrer le brouillon de la stack.' })
  }

  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'technology_stack.draft_saved',
    entityType: 'technology_stack',
    entityId: org.id,
    payload: { revision: result.data.draft_revision, itemCount: items.length },
  })

  return serializeTechnologyStackSettings(result.data)
})
