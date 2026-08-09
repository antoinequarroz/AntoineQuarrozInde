import { track as plausibleTrack } from '@plausible-analytics/tracker'
import { isPlausiblePublicPath } from '~/utils/plausible'

export function usePlausibleEvent() {
  function trackPlausible(eventName: string, props: Record<string, string> = {}) {
    if (!import.meta.client || !isPlausiblePublicPath(window.location.pathname)) return
    try { plausibleTrack(eventName, { props }) }
    catch {}
  }
  return { trackPlausible }
}
