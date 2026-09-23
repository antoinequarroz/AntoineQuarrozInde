import { requireHermesMobileDevice } from '../../../utils/hermesMobileDevice'

export default defineEventHandler(async (event) => {
  await requireHermesMobileDevice(event)
  const config = useRuntimeConfig()
  const apiKey = String(config.posthogPersonalApiKey || '').trim()
  const projectId = String(config.posthogProjectId || '').trim()
  if (!apiKey || !projectId) throw createError({ statusCode: 503, message: 'Mesure PostHog indisponible.' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return await buildPostHogMarketingReport(apiKey, projectId)
})
