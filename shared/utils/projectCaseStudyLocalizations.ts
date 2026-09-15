export const PROJECT_CASE_STUDY_LOCALES = ['fr', 'en', 'de'] as const

export type ProjectCaseStudyLocale = typeof PROJECT_CASE_STUDY_LOCALES[number]

export type ProjectCaseStudyLocalizedResult = {
  value: string
  label: string
  measurementContext: string | null
  evidenceNote: string | null
  approved: boolean
}

export type ProjectCaseStudyLocalization = {
  locale: ProjectCaseStudyLocale
  projectRole: string | null
  projectDuration: string | null
  challenge: string | null
  projectScope: string | null
  keyDecisions: string | null
  approach: string | null
  solution: string | null
  outcome: string | null
  deliverables: string[]
  results: ProjectCaseStudyLocalizedResult[]
}

export const PROJECT_CASE_STUDY_LOCALE_LABELS: Record<ProjectCaseStudyLocale, string> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
}

export function emptyProjectCaseStudyLocalization(locale: ProjectCaseStudyLocale): ProjectCaseStudyLocalization {
  return {
    locale,
    projectRole: null,
    projectDuration: null,
    challenge: null,
    projectScope: null,
    keyDecisions: null,
    approach: null,
    solution: null,
    outcome: null,
    deliverables: [],
    results: [],
  }
}

export function emptyProjectCaseStudyLocalizations(): Record<ProjectCaseStudyLocale, ProjectCaseStudyLocalization> {
  return Object.fromEntries(PROJECT_CASE_STUDY_LOCALES.map(locale => [
    locale,
    emptyProjectCaseStudyLocalization(locale),
  ])) as Record<ProjectCaseStudyLocale, ProjectCaseStudyLocalization>
}

export function projectCaseStudyLocalizationHasContent(localization: ProjectCaseStudyLocalization) {
  return Boolean(
    localization.projectRole?.trim()
    || localization.projectDuration?.trim()
    || localization.challenge?.trim()
    || localization.projectScope?.trim()
    || localization.keyDecisions?.trim()
    || localization.approach?.trim()
    || localization.solution?.trim()
    || localization.outcome?.trim()
    || localization.deliverables.length
    || localization.results.length,
  )
}
