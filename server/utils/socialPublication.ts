export const SOCIAL_PLATFORMS = ['linkedin', 'x'] as const
export const SOCIAL_STATUSES = ['draft', 'approved', 'publishing', 'published', 'rejected', 'failed'] as const
export const MAX_SOCIAL_REQUEST_BYTES = 16 * 1024
export const SOCIAL_APPROVAL_CONFIRMATION = 'APPROUVER_ET_PUBLIER'
const ARTICLE_PREFIX = 'https://www.antoinequarroz.ch/blog/'

export type SocialPlatform = typeof SOCIAL_PLATFORMS[number]
export type SocialStatus = typeof SOCIAL_STATUSES[number]

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
  const articleUrl = requiredText(body.articleUrl, 'URL de l’article', 500)
  if (!articleUrl.startsWith(ARTICLE_PREFIX)) {
    throw createError({ statusCode: 400, message: 'L’URL doit appartenir au blog officiel.' })
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
