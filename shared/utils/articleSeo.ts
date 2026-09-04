import { PUBLIC_SEO_IDENTITY } from './publicSeoIdentity'

export const ARTICLE_LANGUAGE = 'fr-CH'
export const ARTICLE_TIME_ZONE = 'Europe/Zurich'

export type ArticleEditorialMeta = Readonly<{
  authorKey: typeof PUBLIC_SEO_IDENTITY.key
  authorName: typeof PUBLIC_SEO_IDENTITY.name
  datePublished: string
  dateModified: string | null
}>

function validTimestamp(value: unknown, errorCode: string, optional = false): string | null {
  if (optional && (value === null || value === undefined || value === '')) return null
  if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) {
    throw new Error(errorCode)
  }
  return value.trim()
}

export function resolveArticleEditorialMeta(input: {
  authorKey: unknown
  publishedAt: unknown
  updatedAt: unknown
}): ArticleEditorialMeta {
  if (input.authorKey !== PUBLIC_SEO_IDENTITY.key) {
    throw new Error('article_author_invalid')
  }

  const datePublished = validTimestamp(input.publishedAt, 'article_publication_date_invalid') as string
  const updatedAt = validTimestamp(input.updatedAt, 'article_modification_date_invalid', true)
  const dateModified = updatedAt && Date.parse(updatedAt) > Date.parse(datePublished)
    ? updatedAt
    : null

  return Object.freeze({
    authorKey: PUBLIC_SEO_IDENTITY.key,
    authorName: PUBLIC_SEO_IDENTITY.name,
    datePublished,
    dateModified,
  })
}

export function formatArticleEditorialDate(value: string): string {
  return new Intl.DateTimeFormat(ARTICLE_LANGUAGE, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: ARTICLE_TIME_ZONE,
  }).format(new Date(value))
}
