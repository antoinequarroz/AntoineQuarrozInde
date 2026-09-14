import { createError } from 'h3'

export const CLIENT_FOLLOW_UP_NOTE_MAX_LENGTH = 500

type ClientFollowUpInput = {
  nextFollowUpAt?: unknown
  followUpNote?: unknown
  lastContactedAt?: unknown
}

function normalizeNullableString(value: unknown) {
  if (value === null || value === '') return null
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, message: 'Invalid follow-up value' })
  }
  const normalized = value.trim()
  return normalized || null
}

export function normalizeFollowUpDate(value: unknown) {
  const normalized = normalizeNullableString(value)
  if (normalized === null) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError({ statusCode: 400, message: 'Next follow-up date must use YYYY-MM-DD' })
  }
  const parsed = new Date(`${normalized}T00:00:00.000Z`)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw createError({ statusCode: 400, message: 'Next follow-up date is invalid' })
  }
  return normalized
}

export function normalizeFollowUpNote(value: unknown) {
  const normalized = normalizeNullableString(value)
  if (normalized === null) return null
  if (normalized.length > CLIENT_FOLLOW_UP_NOTE_MAX_LENGTH) {
    throw createError({ statusCode: 400, message: `Follow-up note must not exceed ${CLIENT_FOLLOW_UP_NOTE_MAX_LENGTH} characters` })
  }
  return normalized
}

export function normalizeLastContactedAt(value: unknown) {
  const normalized = normalizeNullableString(value)
  if (normalized === null) return null
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)) {
    throw createError({ statusCode: 400, message: 'Last contacted timestamp must be an ISO date-time with timezone' })
  }
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.valueOf())) {
    throw createError({ statusCode: 400, message: 'Last contacted timestamp is invalid' })
  }
  return parsed.toISOString()
}

export function normalizeClientFollowUp(input: ClientFollowUpInput) {
  const normalized: {
    next_follow_up_at?: string | null
    follow_up_note?: string | null
    last_contacted_at?: string | null
  } = {}

  if (Object.hasOwn(input, 'nextFollowUpAt')) {
    normalized.next_follow_up_at = normalizeFollowUpDate(input.nextFollowUpAt)
  }
  if (Object.hasOwn(input, 'followUpNote')) {
    normalized.follow_up_note = normalizeFollowUpNote(input.followUpNote)
  }
  if (Object.hasOwn(input, 'lastContactedAt')) {
    normalized.last_contacted_at = normalizeLastContactedAt(input.lastContactedAt)
  }

  return normalized
}

export function listChangedFollowUpFields(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
) {
  return ['next_follow_up_at', 'follow_up_note', 'last_contacted_at']
    .filter(field => Object.hasOwn(next, field) && (previous[field] ?? null) !== (next[field] ?? null))
}
