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
