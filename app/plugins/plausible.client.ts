import { init } from '@plausible-analytics/tracker'
import { isPlausiblePublicPath } from '~/utils/plausible'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const domain = String(config.public.plausibleDomain || '').trim()
  if (!domain || !isPlausiblePublicPath(window.location.pathname)) return

  init({
    domain,
    endpoint: String(config.public.plausibleEndpoint || 'https://plausible.io/api/event'),
    autoCapturePageviews: true,
    outboundLinks: true,
    fileDownloads: true,
    formSubmissions: true,
    captureOnLocalhost: false,
    logging: import.meta.dev,
    bindToWindow: true,
  })
})
