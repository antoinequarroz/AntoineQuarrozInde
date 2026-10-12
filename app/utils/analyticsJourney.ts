import { classifyAcquisition } from '../../shared/utils/acquisitionChannel'
import { safeAnalyticsPath } from './posthog'

type Journey = { aq_journey_id: string, entry_path: string, entry_source: string, entry_channel: string }
const KEY = 'aq_public_journey_v1'

function safeSource(value: string | null) {
  return value && /^[a-z0-9_.-]{1,80}$/i.test(value) ? value.toLowerCase() : null
}

export function createAnalyticsJourney(input: { id: string, path: string, utmSource: string | null, referrer: string }) : Journey {
  let referrerHost: string | null = null
  try { referrerHost = new URL(input.referrer).hostname.toLowerCase() } catch {}
  if (referrerHost && ['antoinequarroz.ch', 'www.antoinequarroz.ch'].includes(referrerHost)) referrerHost = null
  const utmSource = safeSource(input.utmSource)
  return {
    aq_journey_id: input.id,
    entry_path: safeAnalyticsPath(input.path),
    entry_source: utmSource || referrerHost || 'direct',
    entry_channel: classifyAcquisition({ utmSource, referrerHost }),
  }
}

export function publicJourneyProperties(path: string) {
  try {
    const stored = sessionStorage.getItem(KEY)
    if (stored) {
      const value = JSON.parse(stored) as Journey
      if (/^[a-f0-9-]{36}$/i.test(value.aq_journey_id) && typeof value.entry_path === 'string'
        && typeof value.entry_source === 'string' && typeof value.entry_channel === 'string') return value
    }
    const value = createAnalyticsJourney({ id: crypto.randomUUID(), path, utmSource: new URLSearchParams(window.location.search).get('utm_source'), referrer: document.referrer })
    sessionStorage.setItem(KEY, JSON.stringify(value))
    return value
  } catch { return {} }
}
