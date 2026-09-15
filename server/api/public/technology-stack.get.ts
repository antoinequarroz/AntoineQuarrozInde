import { resolveCanonicalPublicOrganizationId } from '../../utils/publicOrganization'
import { serializePublicTechnologyStack } from '../../utils/technologyStack'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300')

  try {
    const organizationId = await resolveCanonicalPublicOrganizationId()
    if (!organizationId) throw new Error('Canonical public organization not found')

    const { data, error } = await getSupabaseAdmin()
      .from('technology_stack_settings')
      .select('published_items')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (error) throw error
    return serializePublicTechnologyStack(data?.published_items)
  }
  catch (error) {
    console.error('[public-technology-stack] Published stack unavailable', error)
    return serializePublicTechnologyStack(null)
  }
})
