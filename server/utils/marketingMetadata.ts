import { isAcquisitionChannel } from '../../shared/utils/acquisitionChannel'

const STRING_FIELDS: Record<string, number> = {
  service: 80,
  slug: 180,
  category: 80,
}

export function marketingMetadataPayload(value: unknown) {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const result: Record<string, string | number> = {}
  if (isAcquisitionChannel(source.acquisitionChannel)) result.acquisitionChannel = source.acquisitionChannel
  if (Number.isSafeInteger(source.projectId) && Number(source.projectId) > 0) result.projectId = Number(source.projectId)
  for (const [field, max] of Object.entries(STRING_FIELDS)) {
    if (typeof source[field] === 'string' && source[field].trim()) result[field] = source[field].trim().slice(0, max)
  }
  return result
}
