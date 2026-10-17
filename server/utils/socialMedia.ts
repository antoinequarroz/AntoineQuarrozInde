import { createError, getHeader, type H3Event } from 'h3'

export type SocialMediaItem = { type: 'image' | 'video', url: string, alt: string }
export const INSTAGRAM_MIXED_CAPABILITY = 'instagram-mixed-v1'
export const INSTAGRAM_REELS_CAPABILITY = 'instagram-reels-v1'

export function supportsInstagramMixed(event: H3Event) {
  return (getHeader(event, 'x-hermes-social-capabilities') || '').split(',').map(value => value.trim()).includes(INSTAGRAM_MIXED_CAPABILITY)
}

export function supportsInstagramReels(event: H3Event) {
  return (getHeader(event, 'x-hermes-social-capabilities') || '').split(',').map(value => value.trim()).includes(INSTAGRAM_REELS_CAPABILITY)
}

export function isInstagramReelMedia(value: unknown): boolean {
  return Array.isArray(value) && value.length === 1 && value[0]?.type === 'video'
}

export function validateSocialMediaItems(value: unknown, platform: string, storageUrl = ''): SocialMediaItem[] {
  if (!Array.isArray(value) || (value.length > 0 && (platform !== 'instagram' || value.length > 10 || (value.length === 1 && !isInstagramReelMedia(value))))) {
    throw createError({ statusCode: 400, message: 'Ajoute une vidéo seule pour un Reel, ou entre 2 et 10 médias pour un carrousel Instagram.' })
  }
  const seen = new Set<string>()
  return value.map((item) => {
    if (!item || !['image', 'video'].includes(item.type) || typeof item.url !== 'string' || typeof item.alt !== 'string') {
      throw createError({ statusCode: 400, message: 'Chaque média nécessite un type, un fichier et une description.' })
    }
    let url: URL
    try { url = new URL(item.url) }
    catch { throw createError({ statusCode: 400, message: 'Adresse de média invalide.' }) }
    const official = item.type === 'image' && url.origin === 'https://www.antoinequarroz.ch' && url.pathname.startsWith('/social/')
    const prefix = item.type === 'video' ? '/storage/v1/object/public/social-videos/uploads/' : '/storage/v1/object/public/media/uploads/'
    const validVideoPath = /^\/storage\/v1\/object\/public\/social-videos\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp4$/i.test(url.pathname)
    const stored = storageUrl && url.origin === new URL(storageUrl).origin && url.pathname.startsWith(prefix) && (item.type !== 'video' || validVideoPath)
    const extension = item.type === 'video' ? /\.mp4$/i : /\.jpe?g$/i
    const alt = item.alt.trim()
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (!official && !stored)
      || !extension.test(url.pathname) || url.href.length > 500 || !alt || alt.length > 500 || seen.has(url.href)) {
      throw createError({ statusCode: 400, message: 'Utilise des JPEG et MP4 téléversés, avec une description et sans doublon.' })
    }
    seen.add(url.href)
    return { type: item.type, url: url.href, alt }
  })
}
