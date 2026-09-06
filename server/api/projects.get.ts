import {
  isPublicContentRole,
  isMissingCaseStudyApprovalSchema,
  LEGACY_PUBLIC_PROJECT_COLUMNS,
  PUBLIC_PROJECT_COLUMNS,
  serializePublicProject,
} from '../utils/publicContent'

export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event)
  if (!org?.id) return []

  const supabase = getSupabaseAdmin()
  const publicView = isPublicContentRole(org.role)
  if (!publicView) await requireAdminMfa(event, event.context.user)
  let query = supabase
    .from('projects')
    .select(publicView ? PUBLIC_PROJECT_COLUMNS : '*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
  if (publicView) {
    query = query.or('portfolio_visible.eq.true,and(case_study_published.eq.true,case_study_approved_at.not.is.null)')
  }
  let { data, error } = await query

  if (publicView && isMissingCaseStudyApprovalSchema(error)) {
    const legacyResult = await supabase
      .from('projects')
      .select(LEGACY_PUBLIC_PROJECT_COLUMNS)
      .eq('organization_id', org.id)
      .eq('portfolio_visible', true)
      .order('created_at', { ascending: false })
    data = legacyResult.data
    error = legacyResult.error
  }

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  if (!publicView) return data ?? []

  return (data ?? []).map(serializePublicProject)
})
