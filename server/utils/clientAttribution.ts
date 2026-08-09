export type ClientAttributionInput = {
  acquisitionSource?: unknown
  acquisitionMedium?: unknown
  acquisitionCampaign?: unknown
}

function normalizeAttributionValue(value: unknown, maxLength = 120) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
  return normalized || null
}

export function normalizeClientAttribution(input: ClientAttributionInput) {
  return {
    acquisition_source: normalizeAttributionValue(input.acquisitionSource),
    acquisition_medium: normalizeAttributionValue(input.acquisitionMedium),
    acquisition_campaign: normalizeAttributionValue(input.acquisitionCampaign, 180),
  }
}
