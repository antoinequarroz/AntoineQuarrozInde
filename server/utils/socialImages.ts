export type SocialImage = { url: string, alt: string }
export const SOCIAL_MEDIA_REVIEW_CONFIRMATION = 'VALIDER_TEXTE_ET_VISUELS'

export function validateSocialImages(value: unknown, platform: string, storageUrl = ''): SocialImage[] {
  if (!Array.isArray(value) || value.length > (platform === 'x' ? 4 : 10)) {
    throw createError({ statusCode: 400, message: 'Nombre d’images invalide (4 maximum sur X, 10 ailleurs).' })
  }
  const seen = new Set<string>()
  return value.map((image) => {
    if (!image || typeof image.url !== 'string' || typeof image.alt !== 'string') {
      throw createError({ statusCode: 400, message: 'Image et description requises.' })
    }
    let url: URL
    try { url = new URL(image.url) }
    catch { throw createError({ statusCode: 400, message: 'Adresse d’image invalide.' }) }
    const official = url.origin === 'https://www.antoinequarroz.ch' && url.pathname.startsWith('/social/')
    const stored = storageUrl && url.origin === new URL(storageUrl).origin && url.pathname.startsWith('/storage/v1/object/public/media/uploads/')
    const alt = image.alt.trim()
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (!official && !stored)
      || !/\.(?:png|jpe?g|webp)$/i.test(url.pathname) || url.href.length > 500 || !alt || alt.length > 500 || seen.has(url.href)) {
      throw createError({ statusCode: 400, message: 'Utilise une image du site ou téléversée, avec une description unique et sans doublon.' })
    }
    seen.add(url.href)
    return { url: url.href, alt }
  })
}

export function requireAutomaticSocialMedia(images: unknown) {
  if (Array.isArray(images) && images.length) {
    throw createError({ statusCode: 400, message: 'Ces visuels nécessitent une validation et une publication manuelles depuis Réseaux sociaux.' })
  }
}
