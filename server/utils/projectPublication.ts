export type ProjectPublicationState = {
  portfolioVisible: boolean
  caseStudyPublished: boolean
}

export function projectPublicationState(row: {
  portfolio_visible?: boolean | null
  case_study_published?: boolean | null
}): ProjectPublicationState {
  return {
    portfolioVisible: Boolean(row.portfolio_visible),
    caseStudyPublished: Boolean(row.case_study_published),
  }
}

export function projectPublicationChanged(
  before: ProjectPublicationState,
  after: ProjectPublicationState,
) {
  return before.portfolioVisible !== after.portfolioVisible
    || before.caseStudyPublished !== after.caseStudyPublished
}

export function assertCanChangeProjectPublication(
  role: string | null | undefined,
  before: ProjectPublicationState | null,
  after: ProjectPublicationState,
) {
  const changesPublicState = before
    ? projectPublicationChanged(before, after)
    : after.portfolioVisible || after.caseStudyPublished

  if (changesPublicState && role !== 'owner' && role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Only an owner or administrator can change project publication',
    })
  }
}

export function projectPublicationRpcError(error: { code?: string | null, message?: string | null }) {
  const message = String(error.message || 'Unable to save project')

  if (message.includes('project_actor_membership_required')) {
    return createError({
      statusCode: 403,
      message: 'A current organization membership is required to save this project',
    })
  }
  if (message.includes('project_case_study_approver_forbidden')) {
    return createError({
      statusCode: 403,
      message: 'Only a current owner or administrator can approve a case study',
    })
  }
  if (error.code === '42501' || message.includes('project_publication_forbidden')) {
    return createError({
      statusCode: 403,
      message: 'Only an owner or administrator can change project publication',
    })
  }
  if (error.code === 'P0002' || message.includes('project_not_found')) {
    return createError({ statusCode: 404, message: 'Project not found' })
  }
  if (message.includes('project_case_study_locked')) {
    return createError({
      statusCode: 409,
      message: 'Unpublish the case study before changing its approved content',
    })
  }
  if (error.code === '22023' || message.includes('project_case_study_')) {
    return createError({ statusCode: 400, message })
  }
  return createError({ statusCode: 500, message })
}
