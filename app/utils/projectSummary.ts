import type { Project } from '../types'

type ProjectDescription = Pick<Project, 'description' | 'descriptionEn' | 'descriptionDe'>

/** A short excerpt of the published description, with its actual language. */
export function getProjectSummary(project: ProjectDescription, locale: string): { text: string; lang: string } {
  const localized = locale === 'en' && project.descriptionEn?.trim()
    ? { text: project.descriptionEn, lang: 'en' }
    : locale === 'de' && project.descriptionDe?.trim()
      ? { text: project.descriptionDe, lang: 'de' }
      : { text: project.description, lang: 'fr' }
  const description = localized.text.trim().replace(/\s+/g, ' ')
  const firstSentence = description.split(/(?<=[.!?])\s+/u)[0] ?? ''
  if (firstSentence.length <= 125) return { text: firstSentence, lang: localized.lang }
  const prefix = firstSentence.slice(0, 124)
  const wordEnd = prefix.lastIndexOf(' ')
  return { text: `${prefix.slice(0, wordEnd > 80 ? wordEnd : 124).trimEnd()}…`, lang: localized.lang }
}
