import { isPlausiblePublicPath } from '~/utils/plausible'

export function usePlausibleEvent() {
  async function trackPlausible(eventName: string, props: Record<string, string> = {}) {
    if (!import.meta.client || !isPlausiblePublicPath(window.location.pathname)) return
    try {
      const { track } = await import('@plausible-analytics/tracker')
      track(eventName, { props })
    }
    catch {}
  }
  return { trackPlausible }
}
