export const PUBLIC_SERVICE_DECISION_SECTION_KEYS = Object.freeze([
  'deliverables',
  'process',
  'timeline',
  'limits',
  'next-step',
] as const)

export type PublicServiceDecisionContentInput = Readonly<{
  introduction: string
  deliverables: ReadonlyArray<string>
  process: ReadonlyArray<string>
  timeline: string
  limits: ReadonlyArray<string>
  nextStep: string
  proofNote: string
  proof: Readonly<{
    label: string
    path: string
  }>
  contact: Readonly<{
    label: string
    path: string
  }>
}>

export type PublicServiceDecisionContent = Readonly<{
  introduction: string
  deliverables: ReadonlyArray<string>
  process: ReadonlyArray<string>
  timeline: string
  limits: ReadonlyArray<string>
  nextStep: string
  proofNote: string
  proof: Readonly<{
    label: string
    path: '/#portfolio'
  }>
  contact: Readonly<{
    label: string
    path: '/#contact'
  }>
}>

const unapprovedPrecisionPattern = /\d|%|\b(?:chf|eur|usd|francs?|euros?)\b|[€$]/iu
const corruptedTextPattern = /\uFFFD|Ã.|Â.|â€|ðŸ/u

function requireDecisionText(value: string, errorCode: string): string {
  if (!value || value !== value.trim()) throw new Error(errorCode)
  if (corruptedTextPattern.test(value)) throw new Error('public_service_decision_text_corrupted')
  if (unapprovedPrecisionPattern.test(value)) throw new Error('public_service_decision_precision_unapproved')
  return value
}

function requireDecisionList(values: ReadonlyArray<string>, errorCode: string): ReadonlyArray<string> {
  if (!Array.isArray(values) || values.length === 0) throw new Error(errorCode)
  const normalized = values.map(value => requireDecisionText(value, errorCode))
  if (new Set(normalized).size !== normalized.length) throw new Error(`${errorCode}_duplicate`)
  return Object.freeze(normalized)
}

function requireApprovedPath<TPath extends '/#portfolio' | '/#contact'>(
  value: string,
  approvedPath: TPath,
  errorCode: string,
): TPath {
  if (!value || value !== value.trim() || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    throw new Error(errorCode)
  }

  const referenceOrigin = 'https://public-service.invalid'
  const url = new URL(value, referenceOrigin)
  if (url.origin !== referenceOrigin || url.search || `${url.pathname}${url.hash}` !== value || value !== approvedPath) {
    throw new Error(errorCode)
  }
  return approvedPath
}

export function resolvePublicServiceDecisionContent(
  value: PublicServiceDecisionContentInput,
): PublicServiceDecisionContent {
  return Object.freeze({
    introduction: requireDecisionText(value.introduction, 'public_service_decision_introduction_invalid'),
    deliverables: requireDecisionList(value.deliverables, 'public_service_decision_deliverables_invalid'),
    process: requireDecisionList(value.process, 'public_service_decision_process_invalid'),
    timeline: requireDecisionText(value.timeline, 'public_service_decision_timeline_invalid'),
    limits: requireDecisionList(value.limits, 'public_service_decision_limits_invalid'),
    nextStep: requireDecisionText(value.nextStep, 'public_service_decision_next_step_invalid'),
    proofNote: requireDecisionText(value.proofNote, 'public_service_decision_proof_note_invalid'),
    proof: Object.freeze({
      label: requireDecisionText(value.proof.label, 'public_service_decision_proof_label_invalid'),
      path: requireApprovedPath(value.proof.path, '/#portfolio', 'public_service_decision_proof_path_invalid'),
    }),
    contact: Object.freeze({
      label: requireDecisionText(value.contact.label, 'public_service_decision_contact_label_invalid'),
      path: requireApprovedPath(value.contact.path, '/#contact', 'public_service_decision_contact_path_invalid'),
    }),
  })
}
