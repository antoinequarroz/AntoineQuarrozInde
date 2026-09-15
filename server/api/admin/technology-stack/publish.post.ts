import {
  parseExpectedRevision,
  parseTechnologyStackRequest,
  requireTechnologyStackEditor,
  serializeTechnologyStackSettings,
  TECHNOLOGY_STACK_COLUMNS,
  type TechnologyStackRow,
} from '../../../utils/technologyStack'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  requireTechnologyStackEditor(org)
  const body = await readBody(event)
  const expectedDraftRevision = parseExpectedRevision(body?.expectedDraftRevision, 'expectedDraftRevision')
  const expectedPublishedRevision = parseExpectedRevision(body?.expectedPublishedRevision, 'expectedPublishedRevision')
  if (expectedDraftRevision === 0 || expectedPublishedRevision === 0) {
    throw createError({ statusCode: 409, message: 'Enregistre d’abord le brouillon avant de le publier.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: current, error: loadError } = await supabase
    .from('technology_stack_settings')
    .select(TECHNOLOGY_STACK_COLUMNS)
    .eq('organization_id', org.id)
    .eq('draft_revision', expectedDraftRevision)
    .eq('published_revision', expectedPublishedRevision)
    .maybeSingle()

  if (loadError) throw createError({ statusCode: 500, message: 'Impossible de préparer la publication de la stack.' })
  if (!current) throw createError({ statusCode: 409, message: 'La stack a changé dans une autre session. Recharge la page avant de publier.' })

  const currentRow = current as unknown as TechnologyStackRow
  const draftItems = parseTechnologyStackRequest(currentRow.draft_items)
  const publishedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('technology_stack_settings')
    .update({
      published_items: draftItems,
      published_revision: expectedPublishedRevision + 1,
      published_at: publishedAt,
    })
    .eq('organization_id', org.id)
    .eq('draft_revision', expectedDraftRevision)
    .eq('published_revision', expectedPublishedRevision)
    .select(TECHNOLOGY_STACK_COLUMNS)
    .maybeSingle()

  if (!error && !data) throw createError({ statusCode: 409, message: 'La stack a changé pendant la publication. Recharge la page.' })
  if (error) throw createError({ statusCode: 500, message: 'Impossible de publier la stack technique.' })
  const publishedRow = data as unknown as TechnologyStackRow

  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'technology_stack.published',
    entityType: 'technology_stack',
    entityId: org.id,
    payload: { draftRevision: expectedDraftRevision, publishedRevision: publishedRow.published_revision, itemCount: draftItems.length },
  })

  return serializeTechnologyStackSettings(publishedRow)
})
