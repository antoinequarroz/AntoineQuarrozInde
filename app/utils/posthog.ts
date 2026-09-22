export function isPostHogPublicPath(pathname: string) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return !['/admin', '/portal'].some(prefix => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))
}

export function isPostHogProductionHost(hostname: string) {
  return ['antoinequarroz.ch', 'www.antoinequarroz.ch'].includes(hostname.toLowerCase())
}

export function safeAnalyticsPath(value: string) {
  try {
    const url = new URL(value, 'https://www.antoinequarroz.ch')
    return url.pathname
  }
  catch {
    return '/'
  }
}

export function stripAnalyticsUrlQuery(value: unknown) {
  if (typeof value !== 'string' || !value) return value
  try {
    const url = new URL(value, 'https://www.antoinequarroz.ch')
    return `${url.origin}${url.pathname}`
  }
  catch {
    return value
  }
}

export function analyticsContent(pathname: string) {
  const parts = safeAnalyticsPath(pathname).split('/').filter(Boolean)
  if (parts[0] === 'blog' && parts[1]) return { type: 'article', slug: parts[1] }
  if (parts[0] === 'projets' && parts[1]) return { type: 'project', slug: parts[1] }
  return { type: 'page', slug: null }
}
