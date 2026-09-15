import {
  requireTechnologyStackEditor,
  serializeTechnologyStackSettings,
  TECHNOLOGY_STACK_COLUMNS,
  type TechnologyStackRow,
} from '../../utils/technologyStack'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  requireTechnologyStackEditor(org)

  const { data, error } = await getSupabaseAdmin()
    .from('technology_stack_settings')
    .select(TECHNOLOGY_STACK_COLUMNS)
    .eq('organization_id', org.id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, message: 'Impossible de charger la stack technique.' })
  }

  try {
    return serializeTechnologyStackSettings(data as unknown as TechnologyStackRow | null)
  }
  catch (error) {
    console.error('[technology-stack] Invalid stored document', error)
    throw createError({ statusCode: 500, message: 'La stack enregistrée est invalide. Aucune modification n’a été appliquée.' })
  }
})
