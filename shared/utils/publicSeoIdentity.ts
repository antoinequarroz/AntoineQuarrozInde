export const PUBLIC_SEO_IDENTITY = Object.freeze({
  name: 'Antoine Quarroz',
  email: 'info@antoinequarroz.ch',
  emailHref: 'mailto:info@antoinequarroz.ch',
  phone: '+41 79 157 64 50',
  phoneHref: 'tel:+41791576450',
  telephone: '+41791576450',
  address: Object.freeze({
    streetAddress: 'Rue de l’Evouette 5',
    postalCode: '1969',
    addressLocality: 'Saint-Martin',
    addressRegion: 'Valais',
    addressCountry: 'CH',
  }),
  profiles: Object.freeze([
    Object.freeze({ name: 'GitHub', href: 'https://github.com/antoinequarroz', icon: 'github' }),
    Object.freeze({ name: 'LinkedIn', href: 'https://www.linkedin.com/in/antoine-quarroz-376020187/', icon: 'linkedin' }),
  ]),
  defaultSocialImagePath: '/about.jpg',
})

export type PublicSeoLocale = 'fr' | 'en' | 'de'

export const PUBLIC_COUNTRY_LABELS: Readonly<Record<PublicSeoLocale, string>> = Object.freeze({
  fr: 'Suisse',
  en: 'Switzerland',
  de: 'Schweiz',
})

export type PublicSocialImage = Readonly<{
  url: string
  isFallback: boolean
}>

export function normalizePublicSiteOrigin(value: string): string {
  const url = new URL(value)
  if (
    !['http:', 'https:'].includes(url.protocol)
    || url.username
    || url.password
    || (url.pathname !== '/' && url.pathname !== '')
    || url.search
    || url.hash
  ) {
    throw new Error('public_site_origin_invalid')
  }
  return url.origin
}

export function resolvePublicSocialImage(
  siteUrl: string,
  candidate?: string | null,
): PublicSocialImage {
  const origin = normalizePublicSiteOrigin(siteUrl)
  const fallback = `${origin}${PUBLIC_SEO_IDENTITY.defaultSocialImagePath}`
  const value = candidate?.trim()
  if (!value) return { url: fallback, isFallback: true }

  try {
    if (value.startsWith('/') && !value.startsWith('//')) {
      return { url: new URL(value, origin).href, isFallback: false }
    }

    const url = new URL(value)
    const isSameOrigin = url.origin === origin
    if (
      url.username
      || url.password
      || url.hash
      || (url.protocol !== 'https:' && !(isSameOrigin && url.protocol === 'http:'))
    ) {
      return { url: fallback, isFallback: true }
    }
    return { url: url.href, isFallback: false }
  }
  catch {
    return { url: fallback, isFallback: true }
  }
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}
