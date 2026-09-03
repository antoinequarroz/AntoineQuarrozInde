export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const body = buildRobotsPolicy(String(config.public.siteUrl || ''))

  setHeader(event, 'content-type', 'text/plain; charset=UTF-8')
  return body
})
