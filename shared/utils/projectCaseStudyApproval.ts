export const PROJECT_CASE_STUDY_SERVICES = [
  { path: '/developpeur-web-valais', label: 'Développeur web' },
  { path: '/creation-site-internet-valais', label: 'Création de site' },
  { path: '/refonte-site-web-valais', label: 'Refonte de site' },
  { path: '/application-mobile-valais', label: 'Application mobile' },
] as const

export type ProjectCaseStudyServicePath = typeof PROJECT_CASE_STUDY_SERVICES[number]['path']
export type ProjectClientDisclosureStatus = 'pending' | 'anonymous' | 'approved'

export type CaseStudyApprovalInput = {
  projectRole?: string | null
  challenge?: string | null
  projectScope?: string | null
  keyDecisions?: string | null
  outcome?: string | null
  outcomeApproved?: boolean | null
  clientDisclosureStatus?: ProjectClientDisclosureStatus | null
  clientLabel?: string | null
  relatedServicePaths?: readonly string[] | null
}

export type CaseStudyPublicationBlocker = {
  field: keyof CaseStudyApprovalInput
  label: string
}

const SERVICE_PATHS = new Set<string>(PROJECT_CASE_STUDY_SERVICES.map(service => service.path))

function present(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

export function isProjectCaseStudyServicePath(value: string): value is ProjectCaseStudyServicePath {
  return SERVICE_PATHS.has(value)
}

export function projectCaseStudyServiceLabel(path: string) {
  return PROJECT_CASE_STUDY_SERVICES.find(service => service.path === path)?.label ?? null
}

export function caseStudyPublicationBlockers(input: CaseStudyApprovalInput): CaseStudyPublicationBlocker[] {
  const blockers: CaseStudyPublicationBlocker[] = []
  const requiredText: Array<[keyof CaseStudyApprovalInput, string]> = [
    ['challenge', 'Contexte'],
    ['projectRole', 'Rôle d’Antoine'],
    ['projectScope', 'Périmètre'],
    ['keyDecisions', 'Décisions'],
    ['outcome', 'Résultat qualitatif'],
  ]

  for (const [field, label] of requiredText) {
    if (!present(input[field] as string | null | undefined)) blockers.push({ field, label })
  }
  if (!input.outcomeApproved) blockers.push({ field: 'outcomeApproved', label: 'Approbation du résultat qualitatif' })
  if (!input.clientDisclosureStatus || input.clientDisclosureStatus === 'pending') {
    blockers.push({ field: 'clientDisclosureStatus', label: 'Décision de confidentialité' })
  }
  if (input.clientDisclosureStatus === 'approved' && !present(input.clientLabel)) {
    blockers.push({ field: 'clientLabel', label: 'Nom client approuvé' })
  }

  const services = input.relatedServicePaths ?? []
  if (services.length === 0 || services.some(path => !isProjectCaseStudyServicePath(path))) {
    blockers.push({ field: 'relatedServicePaths', label: 'Au moins un service pertinent' })
  }

  return blockers
}
