export const PUBLIC_LOCALES = ['fr', 'en', 'de'] as const

export type PublicLocale = typeof PUBLIC_LOCALES[number]
export type RouteVariantStatus = 'approved' | 'unavailable'

export interface RouteVariantEvidence {
  status: RouteVariantStatus
  humanApprovalRef?: string
  contentRef?: string
  metadataRef?: string
  alternateLocales?: PublicLocale[]
}

export interface LocalizedRouteFamily {
  id: string
  routeName: string
  path: string
  variants: Record<PublicLocale, RouteVariantEvidence>
}

export type LocalizedRoutePolicy = readonly LocalizedRouteFamily[]

function approvedFrenchVariant(sourceRef: string): RouteVariantEvidence {
  return {
    status: 'approved',
    humanApprovalRef: 'OD-SEO-001',
    contentRef: sourceRef,
    metadataRef: sourceRef,
    alternateLocales: ['fr'],
  }
}

function frenchOnlyFamily(
  id: string,
  routeName: string,
  path: string,
  sourceRef = `app/pages${path}.vue`,
): LocalizedRouteFamily {
  return {
    id,
    routeName,
    path,
    variants: {
      fr: approvedFrenchVariant(sourceRef),
      en: { status: 'unavailable' },
      de: { status: 'unavailable' },
    },
  }
}

export const LOCALIZED_ROUTE_POLICY = [
  frenchOnlyFamily('web-development-service', 'developpeur-web-valais', '/developpeur-web-valais'),
  frenchOnlyFamily('website-creation-service', 'creation-site-internet-valais', '/creation-site-internet-valais'),
  frenchOnlyFamily('website-redesign-service', 'refonte-site-web-valais', '/refonte-site-web-valais'),
  frenchOnlyFamily('mobile-application-service', 'application-mobile-valais', '/application-mobile-valais'),
  frenchOnlyFamily('blog-index', 'blog', '/blog', 'app/pages/blog/index.vue'),
  frenchOnlyFamily('blog-article', 'blog-slug', '/blog/**', 'app/pages/blog/[slug].vue'),
  frenchOnlyFamily('case-studies-index', 'cas-clients-valais', '/cas-clients-valais'),
  frenchOnlyFamily('case-study', 'projets-slug', '/projets/**', 'app/pages/projets/[slug].vue'),
] as const satisfies LocalizedRoutePolicy

function requireReference(
  family: LocalizedRouteFamily,
  locale: PublicLocale,
  field: 'humanApprovalRef' | 'contentRef' | 'metadataRef',
) {
  const value = family.variants[locale][field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${family.id}:${locale} is approved without ${field}`)
  }
}

export function validateLocalizedRoutePolicy(policy: LocalizedRoutePolicy): void {
  const familyIds = new Set<string>()
  const routeNames = new Set<string>()

  for (const family of policy) {
    if (familyIds.has(family.id)) throw new Error(`Duplicate route family id: ${family.id}`)
    if (routeNames.has(family.routeName)) throw new Error(`Duplicate route name: ${family.routeName}`)
    familyIds.add(family.id)
    routeNames.add(family.routeName)

    if (family.variants.fr.status !== 'approved') {
      throw new Error(`${family.id}:fr must remain approved`)
    }

    const approvedLocales = PUBLIC_LOCALES.filter(locale => family.variants[locale].status === 'approved')

    for (const locale of approvedLocales) {
      requireReference(family, locale, 'humanApprovalRef')
      requireReference(family, locale, 'contentRef')
      requireReference(family, locale, 'metadataRef')

      const alternates = family.variants[locale].alternateLocales
      if (!Array.isArray(alternates)) {
        throw new Error(`${family.id}:${locale} is approved without alternateLocales`)
      }

      const uniqueAlternates = new Set(alternates)
      if (
        uniqueAlternates.size !== alternates.length
        || approvedLocales.some(approvedLocale => !uniqueAlternates.has(approvedLocale))
        || alternates.some(alternate => !approvedLocales.includes(alternate))
      ) {
        throw new Error(`${family.id}:${locale} does not declare the complete reciprocal alternate set`)
      }
    }
  }
}

export function createI18nPagesConfig(policy: LocalizedRoutePolicy = LOCALIZED_ROUTE_POLICY) {
  validateLocalizedRoutePolicy(policy)

  return Object.fromEntries(policy.map(family => [
    family.routeName,
    Object.fromEntries(PUBLIC_LOCALES.map(locale => [
      locale,
      family.variants[locale].status === 'approved' ? undefined : false,
    ])),
  ])) as Record<string, Partial<Record<PublicLocale, false | undefined>>>
}

function matchesRouteFamily(pathname: string, familyPath: string): boolean {
  if (!familyPath.endsWith('/**')) {
    return pathname === familyPath || pathname === `${familyPath}/`
  }

  const basePath = familyPath.slice(0, -3)
  if (!pathname.startsWith(`${basePath}/`)) return false

  const rawSuffix = pathname.slice(basePath.length + 1)
  const suffixWithoutTrailingSlash = rawSuffix.endsWith('/')
    ? rawSuffix.slice(0, -1)
    : rawSuffix

  return suffixWithoutTrailingSlash.length > 0 && !suffixWithoutTrailingSlash.includes('/')
}

export function isLocalizedRouteVariantApproved(
  pathname: string,
  locale: string,
  policy: LocalizedRoutePolicy = LOCALIZED_ROUTE_POLICY,
): boolean {
  if (!PUBLIC_LOCALES.includes(locale as PublicLocale)) return false

  const unprefixedPathname = pathname.replace(/^\/(?:en|de)(?=\/|$)/, '') || '/'
  const family = policy.find(candidate => matchesRouteFamily(unprefixedPathname, candidate.path))

  return family
    ? family.variants[locale as PublicLocale].status === 'approved'
    : true
}

export function getFrenchOnlyRedirectLocation(
  rawRequestTarget: string,
  policy: LocalizedRoutePolicy = LOCALIZED_ROUTE_POLICY,
): string | null {
  if (
    rawRequestTarget === ''
    || !rawRequestTarget.startsWith('/')
    || rawRequestTarget.startsWith('//')
    || /[\u0000-\u001F\u007F#]/.test(rawRequestTarget)
  ) return null

  const queryIndex = rawRequestTarget.indexOf('?')
  const rawPathname = queryIndex === -1
    ? rawRequestTarget
    : rawRequestTarget.slice(0, queryIndex)
  const rawQuery = queryIndex === -1 ? '' : rawRequestTarget.slice(queryIndex)

  if (rawPathname.includes('\\')) return null

  const localizedPath = rawPathname.match(/^\/(en|de)(\/.*)$/)
  if (!localizedPath) return null

  const rawLocale = localizedPath[1]
  const frenchPath = localizedPath[2]
  if (!rawLocale || !frenchPath) return null

  const locale = rawLocale as Extract<PublicLocale, 'en' | 'de'>
  const family = policy.find(candidate => (
    candidate.variants[locale].status === 'unavailable'
    && matchesRouteFamily(frenchPath, candidate.path)
  ))

  return family ? `${frenchPath}${rawQuery}` : null
}
