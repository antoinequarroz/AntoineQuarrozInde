import { isPostHogProductionHost, isPostHogPublicPath, safeAnalyticsPath, stripAnalyticsUrlQuery } from '~/utils/posthog'

const DOWNLOAD_EXTENSION = /\.(?:pdf|zip|docx?|xlsx?|csv|pptx?)$/i

export default defineNuxtPlugin({
  name: 'posthog-public-pageviews',
  dependsOn: ['posthog-client'],
  setup() {
    const router = useRouter()
    const posthog = usePostHog()
    if (!isPostHogProductionHost(window.location.hostname)) return
    let currentPath = ''
    let pageStartedAt = Date.now()

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
      })
    }

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
        if (destination.origin !== window.location.origin && !['mailto:', 'tel:'].includes(destination.protocol)) {
          posthog?.capture('outbound_link_clicked', properties)
        }
        if (target.hasAttribute('download') || DOWNLOAD_EXTENSION.test(destination.pathname)) {
          posthog?.capture('file_downloaded', properties)
        }
      }, { capture: true })

      window.addEventListener('pagehide', capturePageleave)
    })
  },
})
