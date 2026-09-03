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

  if (error.code === '42501' || message.includes('project_publication_forbidden')) {
    return createError({
      statusCode: 403,
      message: 'Only an owner or administrator can change project publication',
    })
  }
  if (error.code === 'P0002' || message.includes('project_not_found')) {
    return createError({ statusCode: 404, message: 'Project not found' })
  }
  return createError({ statusCode: 500, message })
}
