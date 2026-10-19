import type { Project } from '~/types'

export interface ProjectPresentation {
  readonly kind?: 'client' | 'personal'
  readonly inDevelopment: boolean
}

// Reviewed public facts only. Missing metadata must not become a guessed label.
// Evidence and intentionally unclassified projects: docs/portfolio-project-presentation.md.
const reviewedPresentations = new Map<string, ProjectPresentation>([
  ['physiobaur', { kind: 'client', inDevelopment: false }],
  ['aventuretime-aq', { kind: 'personal', inDevelopment: false }],
  ['threejs-cv', { kind: 'personal', inDevelopment: false }],
  ['envvault', { kind: 'personal', inDevelopment: true }],
  ['hermes-cockpit', { kind: 'personal', inDevelopment: false }],
  ['postmelo', { kind: 'personal', inDevelopment: true }],
  ['orion', { kind: 'personal', inDevelopment: false }],
  ['velqora', { kind: 'personal', inDevelopment: true }],
  ['staq', { kind: 'personal', inDevelopment: false }],
  ['livrematch', { kind: 'personal', inDevelopment: false }],
  ['chat-d-interieur', { kind: 'personal', inDevelopment: false }],
  ['bagage-malin', { kind: 'personal', inDevelopment: false }],
  ['rangements-malins', { kind: 'personal', inDevelopment: false }],
  ['nino', { inDevelopment: true }],
  ['remembeyes', { inDevelopment: true }],
  ['lifxp', { inDevelopment: true }],
])

const unclassifiedPresentation: ProjectPresentation = { inDevelopment: false }

export function getProjectPresentation(project: Pick<Project, 'slug'>): ProjectPresentation {
  return reviewedPresentations.get(project.slug) ?? unclassifiedPresentation
}
