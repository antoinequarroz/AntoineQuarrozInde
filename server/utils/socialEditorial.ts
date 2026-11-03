import { SOCIAL_PLATFORMS, SOCIAL_STATUSES } from './socialPublication'

function invalid(field: string): never {
  throw createError({ statusCode: 400, message: `${field} invalide.` })
}

/** An explicit offset makes the instant independent of the server's timezone. */
function offsetTimestamp(value: unknown, field: string): string {
  if (typeof value !== 'string') return invalid(field)
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match || match[0] !== value) return invalid(field)
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offset] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]!
    || Number(hourText) > 23 || Number(minuteText) > 59 || Number(secondText || 0) > 59) return invalid(field)
  if (offset !== 'Z' && (Number(offset!.slice(1, 3)) > 23 || Number(offset!.slice(4, 6)) > 59)) return invalid(field)
  const timestamp = new Date(value)
  if (!Number.isFinite(timestamp.getTime()) || timestamp.getUTCFullYear() < 1 || timestamp.getUTCFullYear() > 9999) return invalid(field)
  return timestamp.toISOString()
}

export function validateSocialPlannedAt(value: unknown): string | null {
  return value === null ? null : offsetTimestamp(value, 'Date éditoriale')
}

export function validateSocialPublishAfter(value: unknown, now = new Date()): string {
  const timestamp = offsetTimestamp(value, 'Date de publication')
  if (Date.parse(timestamp) <= now.getTime()) {
    throw createError({ statusCode: 400, message: 'La date de publication doit être dans le futur.' })
  }
  return timestamp
}

const STATUS_GROUPS = {
  review: ['draft', 'failed'],
  waiting: ['approved', 'publishing'],
} as const

function positiveInteger(value: unknown, fallback: number, field: string, maximum: number): number {
  if (value === undefined) return fallback
  const match = typeof value === 'string' ? /^[1-9]\d*$/.exec(value) : null
  if (!match || match[0] !== value) return invalid(field)
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number > maximum) return invalid(field)
  return number
}

export function parseSocialPostListQuery(query: Record<string, unknown>) {
  const pageSize = positiveInteger(query.pageSize, 100, 'Taille de page', 100)
  const page = positiveInteger(query.page, 1, 'Page', Math.floor(Number.MAX_SAFE_INTEGER / pageSize))
  const platform = query.platform === undefined || query.platform === 'all' ? null : query.platform
  if (platform !== null && !SOCIAL_PLATFORMS.includes(platform as any)) return invalid('Réseau')
  const status = query.status === undefined ? 'all' : query.status
  if (typeof status !== 'string' || (status !== 'all' && !Object.hasOwn(STATUS_GROUPS, status) && !SOCIAL_STATUSES.includes(status as any))) return invalid('Statut')
  const statuses = status === 'all' ? null : Object.hasOwn(STATUS_GROUPS, status) ? STATUS_GROUPS[status as keyof typeof STATUS_GROUPS] : [status]
  if (query.search !== undefined && typeof query.search !== 'string') return invalid('Recherche')
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  if (search.length > 160) return invalid('Recherche')
  return { page, pageSize, offset: (page - 1) * pageSize, platform: platform as typeof SOCIAL_PLATFORMS[number] | null, statuses, search }
}

/** Quote PostgREST values and escape LIKE wildcards; search cannot add filters. */
export function socialPostSearchFilter(search: string): string {
  const pattern = `%${search.replace(/[\\%_]/g, character => `\\${character}`)}%`
  const quoted = `"${pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  return `article_title.ilike.${quoted},content.ilike.${quoted}`
}
