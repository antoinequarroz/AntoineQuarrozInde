import { isPostHogProductionHost, isPostHogPublicPath, safeAnalyticsPath, stripAnalyticsUrlQuery } from '~/utils/posthog'

const DOWNLOAD_EXTENSION = /\.(?:pdf|zip|docx?|xlsx?|csv|pptx?)$/i

function contentProperties(path: string) {
  const parts = path.split('/').filter(Boolean)
  if (parts[0] === 'blog' && parts[1]) return { content_type: 'article', content_slug: parts[1] }
  if (parts[0] === 'projets' && parts[1]) return { content_type: 'project', content_slug: parts[1] }
  return { content_type: 'page' }
}

export default defineNuxtPlugin({
  name: 'posthog-public-pageviews',
  dependsOn: ['posthog-client'],
  setup(nuxtApp) {
    const router = useRouter()
    const posthog = usePostHog()
    if (!isPostHogProductionHost(window.location.hostname)) return
    let currentPath = ''
    let pageStartedAt = Date.now()
    let capturedErrors = 0

    posthog?.set_config({
      before_send(event) {
        if (!event) return event
        for (const key of ['$current_url', '$referrer']) {
          if (key in event.properties) event.properties[key] = stripAnalyticsUrlQuery(event.properties[key])
        }
        return event
      },
    })

    function capturePageleave() {
      if (!currentPath || !isPostHogPublicPath(currentPath)) return
      posthog?.capture('$pageleave', {
        $current_url: `${window.location.origin}${currentPath}`,
        $pathname: currentPath,
        $prev_pageview_duration: Math.max(0, (Date.now() - pageStartedAt) / 1000),
      })
    }

    function capturePageview(path: string) {
      const safePath = safeAnalyticsPath(path)
      if (!isPostHogPublicPath(safePath)) return
      currentPath = safePath
      pageStartedAt = Date.now()
      posthog?.capture('$pageview', {
        $current_url: `${window.location.origin}${safePath}`,
        $pathname: safePath,
        ...contentProperties(safePath),
      })
    }

    function capturePublicError(kind: 'vue' | 'window' | 'promise', value: unknown) {
      if (capturedErrors >= 5 || !isPostHogPublicPath(window.location.pathname)) return
      const errorName = value instanceof Error && value.name ? value.name.slice(0, 80) : 'UnknownError'
      capturedErrors += 1
      posthog?.capture('public_app_error', {
        error_kind: kind,
        error_name: errorName,
        source_path: safeAnalyticsPath(window.location.pathname),
      })
    }

    const onWindowError = (event: ErrorEvent) => capturePublicError('window', event.error)
    const onUnhandledRejection = (event: PromiseRejectionEvent) => capturePublicError('promise', event.reason)
    nuxtApp.hook('vue:error', error => capturePublicError('vue', error))

    router.afterEach((to, from) => {
      if (from.fullPath) capturePageleave()
      capturePageview(to.fullPath)
    })

    onNuxtReady(() => {
      if (!currentPath) capturePageview(router.currentRoute.value.fullPath)

      document.addEventListener('click', (event) => {
        if (!isPostHogPublicPath(window.location.pathname)) return
        const target = event.target instanceof Element ? event.target.closest('a[href]') : null
        if (!(target instanceof HTMLAnchorElement)) return
        const destination = new URL(target.href, window.location.href)
        const properties = {
          destination_host: destination.host,
          destination_path: destination.pathname,
          source_path: window.location.pathname,
        }
        const contactDestination = destination.origin === window.location.origin
          && (destination.pathname === '/contact' || destination.hash === '#contact')
        if (contactDestination || destination.protocol === 'mailto:' || destination.host === 'cal.com' || destination.host.endsWith('.cal.com')) {
          posthog?.capture('contact_clicked', { ...properties, contact_type: destination.protocol === 'mailto:' ? 'email' : destination.host.includes('cal.com') ? 'booking' : 'form' })
        }
        if (destination.origin !== window.location.origin && !['mailto:', 'tel:'].includes(destination.protocol)) {
          posthog?.capture('outbound_link_clicked', properties)
        }
        if (target.hasAttribute('download') || DOWNLOAD_EXTENSION.test(destination.pathname)) {
          posthog?.capture('file_downloaded', properties)
        }
      }, { capture: true })

      window.addEventListener('pagehide', capturePageleave)
      window.addEventListener('error', onWindowError)
      window.addEventListener('unhandledrejection', onUnhandledRejection)
    })
  },
})
