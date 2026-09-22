export const SOCIAL_PLATFORMS = ['linkedin', 'x'] as const
export const SOCIAL_STATUSES = ['draft', 'approved', 'publishing', 'published', 'rejected', 'failed'] as const
export const MAX_SOCIAL_REQUEST_BYTES = 16 * 1024
export const SOCIAL_SCHEDULE_CONFIRMATION = 'PROGRAMMER_POUR_18H'
export const SOCIAL_PUBLISH_NOW_CONFIRMATION = 'PUBLIER_MAINTENANT'
export const SOCIAL_PUBLICATION_TIMEZONE = 'Europe/Zurich'
const SITE_HOME = 'https://www.antoinequarroz.ch/'
const ARTICLE_PREFIX = `${SITE_HOME}blog/`

export type SocialPlatform = typeof SOCIAL_PLATFORMS[number]
export type SocialStatus = typeof SOCIAL_STATUSES[number]
export type SocialApprovalMode = 'scheduled' | 'now'

function zurichParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SOCIAL_PUBLICATION_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value)
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour') }
}

function zurichOffsetMinutes(date: Date) {
  const value = new Intl.DateTimeFormat('en', {
    timeZone: SOCIAL_PUBLICATION_TIMEZONE,
    timeZoneName: 'longOffset',
  }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value || ''
  const match = value.match(/^GMT([+-])(\d{2}):(\d{2})$/)
  if (!match) throw new Error('Fuseau Europe/Zurich indisponible.')
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return match[1] === '-' ? -minutes : minutes
}

export function nextSocialPublicationAt(now = new Date()) {
  const local = zurichParts(now)
  const dayOffset = local.hour >= 18 ? 1 : 0
  const targetDay = new Date(Date.UTC(local.year, local.month - 1, local.day + dayOffset, 12))
  const target = zurichParts(targetDay)
  const offset = zurichOffsetMinutes(targetDay)
  return new Date(Date.UTC(target.year, target.month - 1, target.day, 18) - offset * 60_000)
}

export function validateSocialApprovalMode(value: unknown): SocialApprovalMode {
  if (value !== 'scheduled' && value !== 'now') {
    throw createError({ statusCode: 400, message: 'Mode de publication invalide.' })
  }
  return value
}

function requiredText(value: unknown, field: string, max: number) {
  if (typeof value !== 'string') throw createError({ statusCode: 400, message: `${field} invalide.` })
  const text = value.trim()
  if (!text || text.length > max) throw createError({ statusCode: 400, message: `${field} invalide.` })
  return text
}

export function validateSocialPlatform(value: unknown): SocialPlatform {
  if (!SOCIAL_PLATFORMS.includes(value as SocialPlatform)) {
    throw createError({ statusCode: 400, message: 'Plateforme invalide.' })
  }
  return value as SocialPlatform
}

export function validateSocialContent(platform: SocialPlatform, value: unknown) {
  const content = requiredText(value, 'Texte', platform === 'x' ? 280 : 3000)
  if (platform === 'x' && [...content].length > 280) {
    throw createError({ statusCode: 400, message: 'Le texte X dépasse 280 caractères.' })
  }
  return content
}

export function validateSocialDraftInput(body: Record<string, unknown>) {
  const platform = validateSocialPlatform(body.platform)
  const articleUrl = requiredText(body.articleUrl, 'Lien public associé', 500)
  if (articleUrl !== SITE_HOME && !articleUrl.startsWith(ARTICLE_PREFIX)) {
    throw createError({ statusCode: 400, message: 'Le lien doit être la page d’accueil ou un article du site officiel.' })
  }
  const sourcePath = body.sourcePath == null ? null : requiredText(body.sourcePath, 'Chemin source', 300)
  if (sourcePath && !/^seo\/social\/a-valider\/[A-Za-z0-9._/-]+\.md$/.test(sourcePath)) {
    throw createError({ statusCode: 400, message: 'Chemin source invalide.' })
  }
  return {
    platform,
    sourceKey: requiredText(body.sourceKey, 'Clé source', 180),
    articleTitle: requiredText(body.articleTitle, 'Titre', 180),
    articleUrl,
    content: validateSocialContent(platform, body.content),
    sourcePath,
  }
}

export function validateExpectedVersion(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw createError({ statusCode: 400, message: 'Version invalide.' })
  }
  return Number(value)
}

export function cleanSocialError(value: unknown) {
  const message = typeof value === 'string' ? value : 'Échec de publication signalé par Hermes.'
  return message.replace(/Bearer\s+\S+/gi, 'Bearer [masqué]').slice(0, 1000)
}

export async function resolveHermesOrganization() {
  const slug = String(useRuntimeConfig().public.defaultOrganizationSlug || '')
  if (!slug) throw createError({ statusCode: 500, message: 'Organisation Hermes non configurée.' })
  const { data, error } = await getSupabaseAdmin().from('organizations').select('id').eq('slug', slug).maybeSingle()
  if (error || !data) throw createError({ statusCode: 500, message: 'Organisation introuvable.' })
  return data
}
