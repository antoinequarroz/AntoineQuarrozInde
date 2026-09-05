export type LeadAttribution = {
  landingPath: string | null
  referrerHost: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
}

const STORAGE_KEY = 'aq_lead_attribution'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

function clipped(value: string | null, max = 180) {
  const normalized = value?.trim()
  return normalized ? normalized.slice(0, max) : null
}

export function captureLeadAttribution(): LeadAttribution {
  const empty: LeadAttribution = { landingPath: null, referrerHost: null, utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null }
  if (!import.meta.client) return empty

  let stored: string | null = null
  try { stored = sessionStorage.getItem(STORAGE_KEY) }
  catch { return empty }
  if (stored) {
    try { return { ...empty, ...JSON.parse(stored) } }
    catch {
      try { sessionStorage.removeItem(STORAGE_KEY) }
      catch { return empty }
    }
  }

  const params = new URLSearchParams(window.location.search)
  let referrerHost: string | null = null
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : null }
  catch {}
  const attribution: LeadAttribution = {
    landingPath: clipped(window.location.pathname, 500),
    referrerHost: clipped(referrerHost),
    utmSource: clipped(params.get(UTM_KEYS[0])),
    utmMedium: clipped(params.get(UTM_KEYS[1])),
    utmCampaign: clipped(params.get(UTM_KEYS[2])),
    utmContent: clipped(params.get(UTM_KEYS[3])),
    utmTerm: clipped(params.get(UTM_KEYS[4])),
  }
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution)) }
  catch {}
  return attribution
}
