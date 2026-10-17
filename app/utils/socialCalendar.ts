import type { EditorialSocialMediaItem as SocialMediaItem, EditorialSocialPlatform as SocialPlatform, SocialPost } from '../../shared/types/socialEditorial'
import { isSocialDateKey, isoToZurichLocal, zurichDateKey } from '#shared/utils/socialDateTime'

export type SocialCalendarView = 'week' | 'month' | 'list'
export type SocialCalendarStatusFilter = 'all' | 'review' | 'waiting' | 'published' | 'failed' | 'rejected'
export type SocialCalendarFormat = 'image' | 'carousel' | 'video' | 'document' | 'text'
export type SocialCalendarFilters = {
  view: SocialCalendarView
  platform: 'all' | SocialPlatform
  status: SocialCalendarStatusFilter
  format: 'all' | SocialCalendarFormat
  search: string
  date: string
}

function namedValue<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return typeof value === 'string' && choices.includes(value as T) ? value as T : fallback
}

export function parseSocialCalendarFilters(query: Record<string, unknown>, today = zurichDateKey(new Date().toISOString())): SocialCalendarFilters {
  return {
    view: namedValue(query.view, ['week', 'month', 'list'], 'week'),
    platform: namedValue(query.platform, ['all', 'linkedin', 'x', 'instagram'], 'all'),
    status: namedValue(query.status, ['all', 'review', 'waiting', 'published', 'failed', 'rejected'], 'all'),
    format: namedValue(query.format, ['all', 'image', 'carousel', 'video', 'document', 'text'], 'all'),
    search: typeof query.search === 'string' ? query.search.slice(0, 300) : '',
    date: isSocialDateKey(query.date) ? query.date : today,
  }
}

/** Calendar-only arithmetic keeps every column stable across clock changes. */
export function calendarDays(anchor: string, view: 'week' | 'month'): string[] {
  if (!isSocialDateKey(anchor)) return []
  const date = new Date(`${anchor}T12:00:00.000Z`)
  if (view === 'month') date.setUTCDate(1)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return Array.from({ length: view === 'week' ? 7 : 42 }, (_, index) => {
    const day = new Date(date)
    day.setUTCDate(day.getUTCDate() + index)
    return day.toISOString().slice(0, 10)
  }).filter(isSocialDateKey)
}

export function socialPlatformLabel(platform: SocialPlatform): string {
  return { linkedin: 'LinkedIn', x: 'X', instagram: 'Instagram' }[platform]
}

export function socialPostMedia(post: Pick<SocialPost, 'media_items' | 'media_images'>): SocialMediaItem[] {
  return post.media_items?.length
    ? post.media_items.map(item => ({ ...item }))
    : (post.media_images || []).map(item => ({ ...item, type: 'image' as const }))
}

export function socialPostFormat(post: Pick<SocialPost, 'media_items' | 'media_images' | 'media_kind' | 'media_url'>): SocialCalendarFormat {
  if (post.media_kind === 'document' && post.media_url) return 'document'
  const media = socialPostMedia(post)
  if (media.length > 1) return 'carousel'
  return media[0]?.type || 'text'
}

export function socialPostCalendarIso(post: Pick<SocialPost, 'status' | 'publication_mode' | 'planned_at' | 'publish_after' | 'published_at'>): string | null {
  const valid = (value: string | null | undefined) => value && isoToZurichLocal(value) ? value : null
  if (post.status === 'published') return valid(post.published_at) || valid(post.publish_after)
  if (['approved', 'publishing'].includes(post.status) && post.publication_mode === 'automatic') return valid(post.publish_after)
  return valid(post.planned_at)
}

export function matchesSocialCalendarFilters(post: SocialPost, filters: Pick<SocialCalendarFilters, 'platform' | 'status' | 'format' | 'search'>): boolean {
  if (filters.platform !== 'all' && post.platform !== filters.platform) return false
  if (filters.status === 'review' && !['draft', 'failed'].includes(post.status)) return false
  if (filters.status === 'waiting' && !['approved', 'publishing'].includes(post.status)) return false
  if (!['all', 'review', 'waiting'].includes(filters.status) && post.status !== filters.status) return false
  if (filters.format !== 'all' && socialPostFormat(post) !== filters.format) return false
  const search = filters.search.trim().toLocaleLowerCase('fr-CH')
  return !search || [post.article_title, post.article_url, post.content].join(' ').toLocaleLowerCase('fr-CH').includes(search)
}
