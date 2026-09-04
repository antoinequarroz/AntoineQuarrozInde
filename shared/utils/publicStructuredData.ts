import {
  normalizePublicSiteOrigin,
  PUBLIC_SEO_IDENTITY,
} from './publicSeoIdentity'

export type PublicBreadcrumbInput = Readonly<{
  name: string
  path: string
}>

export type PublicBreadcrumbItem = Readonly<{
  name: string
  path: string
  url: string
}>

export type PublicBreadcrumbTrail = Readonly<{
  items: ReadonlyArray<PublicBreadcrumbItem>
  jsonLd: Readonly<{
    '@type': 'BreadcrumbList'
    'itemListElement': ReadonlyArray<Readonly<{
      '@type': 'ListItem'
      'position': number
      'name': string
      'item': string
    }>>
  }>
}>

export type PublicServiceInput = Readonly<{
  name: string
  serviceType: string
  description: string
  path: string
  areaServed: string
}>

function requirePublicText(value: string, errorCode: string): string {
  if (!value || value !== value.trim()) throw new Error(errorCode)
  return value
}

function normalizePublicPath(value: string): string {
  if (!value || value !== value.trim() || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    throw new Error('public_structured_path_invalid')
  }

  const referenceOrigin = 'https://public-path.invalid'
  const url = new URL(value, referenceOrigin)
  if (url.origin !== referenceOrigin || url.search || url.hash || url.pathname !== value) {
    throw new Error('public_structured_path_invalid')
  }
  return value
}

export function resolvePublicBreadcrumbTrail(
  siteUrl: string,
  values: ReadonlyArray<PublicBreadcrumbInput>,
): PublicBreadcrumbTrail {
  const origin = normalizePublicSiteOrigin(siteUrl)
  if (values.length < 2) throw new Error('public_breadcrumb_items_invalid')

  const seenPaths = new Set<string>()
  const items = values.map((value) => {
    const name = requirePublicText(value.name, 'public_breadcrumb_name_invalid')
    const path = normalizePublicPath(value.path)
    if (seenPaths.has(path)) throw new Error('public_breadcrumb_path_duplicate')
    seenPaths.add(path)
    return Object.freeze({ name, path, url: `${origin}${path}` })
  })

  return Object.freeze({
    items: Object.freeze(items),
    jsonLd: Object.freeze({
      '@type': 'BreadcrumbList' as const,
      itemListElement: Object.freeze(items.map((item, index) => Object.freeze({
        '@type': 'ListItem' as const,
        position: index + 1,
        name: item.name,
        item: item.url,
      }))),
    }),
  })
}

export function resolvePublicService(
  siteUrl: string,
  value: PublicServiceInput,
) {
  const origin = normalizePublicSiteOrigin(siteUrl)
  const path = normalizePublicPath(value.path)
  const canonicalUrl = `${origin}${path}`

  return Object.freeze({
    '@type': 'Service' as const,
    '@id': `${canonicalUrl}#service`,
    name: requirePublicText(value.name, 'public_service_name_invalid'),
    serviceType: requirePublicText(value.serviceType, 'public_service_type_invalid'),
    description: requirePublicText(value.description, 'public_service_description_invalid'),
    url: canonicalUrl,
    mainEntityOfPage: Object.freeze({
      '@type': 'WebPage' as const,
      '@id': canonicalUrl,
    }),
    provider: Object.freeze({
      '@type': 'ProfessionalService' as const,
      '@id': `${origin}/#business`,
      name: PUBLIC_SEO_IDENTITY.name,
      url: `${origin}/`,
    }),
    areaServed: Object.freeze({
      '@type': 'AdministrativeArea' as const,
      name: requirePublicText(value.areaServed, 'public_service_area_invalid'),
    }),
  })
}
