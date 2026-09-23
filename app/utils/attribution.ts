export type LeadAttribution = {
  landingPath: string | null
  referrerHost: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  lastLandingPath: string | null
  lastReferrerHost: string | null
  lastUtmSource: string | null
  lastUtmMedium: string | null
  lastUtmCampaign: string | null
  lastUtmContent: string | null
  lastUtmTerm: string | null
}

const STORAGE_KEY = 'aq_lead_attribution'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

function clipped(value: string | null, max = 180) {
  const normalized = value?.trim()
  return normalized ? normalized.slice(0, max) : null
}

export function captureLeadAttribution(): LeadAttribution {
  const empty: LeadAttribution = {
    landingPath: null, referrerHost: null, utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null,
    lastLandingPath: null, lastReferrerHost: null, lastUtmSource: null, lastUtmMedium: null, lastUtmCampaign: null, lastUtmContent: null, lastUtmTerm: null,
  }
  if (!import.meta.client) return empty

  const params = new URLSearchParams(window.location.search)
  let referrerHost: string | null = null
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : null }
  catch {}
  const touch = {
    landingPath: clipped(window.location.pathname, 500),
    referrerHost: clipped(referrerHost),
    utmSource: clipped(params.get(UTM_KEYS[0])),
    utmMedium: clipped(params.get(UTM_KEYS[1])),
    utmCampaign: clipped(params.get(UTM_KEYS[2])),
    utmContent: clipped(params.get(UTM_KEYS[3])),
    utmTerm: clipped(params.get(UTM_KEYS[4])),
  }
  let first: Partial<LeadAttribution> = {}
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) first = JSON.parse(stored)
  }
  catch {
    try { sessionStorage.removeItem(STORAGE_KEY) }
    catch { return empty }
  }
  const attribution: LeadAttribution = {
    ...empty,
    ...touch,
    ...first,
    lastLandingPath: touch.landingPath,
    lastReferrerHost: touch.referrerHost,
    lastUtmSource: touch.utmSource,
    lastUtmMedium: touch.utmMedium,
    lastUtmCampaign: touch.utmCampaign,
    lastUtmContent: touch.utmContent,
    lastUtmTerm: touch.utmTerm,
  }
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution)) }
  catch {}
  return attribution
}
