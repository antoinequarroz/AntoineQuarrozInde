export function isPlausiblePublicPath(pathname: string) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return !['/admin', '/portal'].some(prefix => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))
}
