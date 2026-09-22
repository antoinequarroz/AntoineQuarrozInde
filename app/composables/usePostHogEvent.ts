import { isPostHogProductionHost, isPostHogPublicPath } from '~/utils/posthog'

type AnalyticsProperty = string | number | boolean | null | undefined

export function usePostHogEvent() {
  const posthog = usePostHog()

  function trackPostHog(eventName: string, properties: Record<string, AnalyticsProperty> = {}) {
    if (!import.meta.client || !isPostHogProductionHost(window.location.hostname) || !isPostHogPublicPath(window.location.pathname)) return
    posthog?.capture(eventName, properties)
  }

  return { trackPostHog }
}
