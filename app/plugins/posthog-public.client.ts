import { isPostHogProductionHost, isPostHogPublicPath, safeAnalyticsPath, stripAnalyticsUrlQuery } from '~/utils/posthog'
import { publicJourneyProperties } from '~/utils/analyticsJourney'
import { excludeInternalVisit } from '~~/shared/utils/analyticsQuality'

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
    const auth = useAuthStore()
    if (!isPostHogProductionHost(window.location.hostname)) return
    let currentPath = ''
    let pageStartedAt = Date.now()
    watch(() => auth.organizations, (organizations) => {
      if (auth.isAuthenticated && organizations.some(org => ['owner', 'admin', 'manager', 'viewer'].includes(org.role))) {
        try { localStorage.setItem('aq_analytics_exclude', '1') } catch {}
      }
    }, { immediate: true })

    posthog?.set_config({
      capture_exceptions: true,
      before_send(event) {
        if (!event) return event
        let optedOut = false
        try { optedOut = localStorage.getItem('aq_analytics_exclude') === '1' } catch {}
        const staff = auth.isAuthenticated && (!auth.organizations.length || auth.organizations.some(org => ['owner', 'admin', 'manager', 'viewer'].includes(org.role)))
        if (excludeInternalVisit({ staff, webdriver: navigator.webdriver, userAgent: navigator.userAgent, optedOut }) || event.properties?.is_test === true) return null
        if (!isPostHogPublicPath(window.location.pathname)) return null
        event.properties = { ...event.properties, ...publicJourneyProperties(currentPath || window.location.pathname), aq_traffic: 'public', aq_analytics_version: 3 }
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

    nuxtApp.hook('vue:error', (error) => {
      if (isPostHogPublicPath(window.location.pathname)) posthog?.captureException(error)
    })

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
          && (destination.pathname === '/contact' || destination.hash === '#contact' || destination.hash === '#contact-form')
        if (contactDestination || destination.protocol === 'mailto:' || destination.host === 'cal.com' || destination.host.endsWith('.cal.com')) {
          try { sessionStorage.setItem('aq_contact_origin', window.location.pathname) } catch {}
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
    })
  },
})
