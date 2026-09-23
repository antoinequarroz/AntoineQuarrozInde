import { classifyAcquisition } from '../../shared/utils/acquisitionChannel'

const MAX_ATTRIBUTION_LENGTH = 180
const MAX_LANDING_PATH_LENGTH = 500

function clean(value: unknown, maxLength = MAX_ATTRIBUTION_LENGTH) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? text.slice(0, maxLength) : null
}

export function leadAttributionPayload(value: unknown) {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    landing_path: clean(source.landingPath, MAX_LANDING_PATH_LENGTH),
    referrer_host: clean(source.referrerHost),
    utm_source: clean(source.utmSource),
    utm_medium: clean(source.utmMedium),
    utm_campaign: clean(source.utmCampaign),
    utm_content: clean(source.utmContent),
    utm_term: clean(source.utmTerm),
    last_landing_path: clean(source.lastLandingPath, MAX_LANDING_PATH_LENGTH),
    last_referrer_host: clean(source.lastReferrerHost),
    last_utm_source: clean(source.lastUtmSource),
    last_utm_medium: clean(source.lastUtmMedium),
    last_utm_campaign: clean(source.lastUtmCampaign),
    last_utm_content: clean(source.lastUtmContent),
    last_utm_term: clean(source.lastUtmTerm),
  }
}

export function leadAcquisitionChannel(value: unknown) {
  const attribution = leadAttributionPayload(value)
  return classifyAcquisition({
    utmSource: attribution.utm_source,
    referrerHost: attribution.referrer_host,
  })
}

export function leadLastAcquisitionChannel(value: unknown) {
  const attribution = leadAttributionPayload(value)
  return classifyAcquisition({
    utmSource: attribution.last_utm_source,
    referrerHost: attribution.last_referrer_host,
  })
}
