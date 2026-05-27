export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '')

  const body = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`

  setHeader(event, 'content-type', 'text/plain; charset=UTF-8')
  return body
})
