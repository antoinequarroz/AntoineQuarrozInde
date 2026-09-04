import {
  isPublicContentRole,
  PUBLIC_PROJECT_COLUMNS,
  serializePublicProject,
} from '../utils/publicContent'

export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event)
  if (!org?.id) return []

  const supabase = getSupabaseAdmin()
  const publicView = isPublicContentRole(org.role)
  let query = supabase
    .from('projects')
    .select(publicView ? PUBLIC_PROJECT_COLUMNS : '*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
  if (publicView) query = query.or('portfolio_visible.eq.true,case_study_published.eq.true')
  const { data, error } = await query

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  if (!publicView) return data ?? []

  return (data ?? []).map(serializePublicProject)
})
