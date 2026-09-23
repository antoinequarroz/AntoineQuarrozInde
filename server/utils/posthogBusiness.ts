import { createHash } from 'node:crypto'

export const POSTHOG_BUSINESS_EVENTS = [
  'crm_lead_created',
  'client_won',
  'quote_accepted',
  'invoice_created',
] as const

export type PostHogBusinessEvent = typeof POSTHOG_BUSINESS_EVENTS[number]

type BusinessEventInput = {
  event: PostHogBusinessEvent
  organizationId: string
  entityType: 'client' | 'quote' | 'invoice'
  entityId: string | number
  clientId?: string | number | null
  amountCents?: number | null
  currency?: string | null
  channel?: string | null
}

const ALLOWED_CHANNELS = new Set(['organic_search', 'generative_ai', 'direct', 'campaign', 'unknown_referral'])
const ALLOWED_CURRENCIES = new Set(['CHF', 'EUR', 'USD'])

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function buildPostHogBusinessPayload(input: BusinessEventInput, projectToken: string) {
  const organizationHash = digest(`organization:${input.organizationId}`)
  const clientReference = input.clientId ?? (input.entityType === 'client' ? input.entityId : null)
  const distinctId = clientReference === null
    ? digest(`${organizationHash}:${input.entityType}:${input.entityId}`)
    : digest(`${organizationHash}:client:${clientReference}`)
  const amountCents = Number(input.amountCents)
  const currency = String(input.currency || '').toUpperCase()
  const channel = String(input.channel || '')

  return {
    api_key: projectToken,
    event: input.event,
    properties: {
      distinct_id: `business:${distinctId}`,
      $insert_id: digest(`${organizationHash}:${input.event}:${input.entityType}:${input.entityId}`),
      $host: 'www.antoinequarroz.ch',
      $process_person_profile: false,
      source_system: 'crm',
      entity_type: input.entityType,
      organization_hash: organizationHash,
      ...(Number.isSafeInteger(amountCents) && amountCents >= 0 ? { amount_cents: amountCents } : {}),
      ...(ALLOWED_CURRENCIES.has(currency) ? { currency } : {}),
      ...(ALLOWED_CHANNELS.has(channel) ? { channel } : {}),
    },
  }
}

export async function capturePostHogBusinessEvent(input: BusinessEventInput) {
  const config = useRuntimeConfig()
  const projectToken = String(config.posthogProjectToken || '').trim()
  if (!projectToken) return false

  const host = String(config.posthogIngestionHost || 'https://eu.i.posthog.com').replace(/\/+$/, '')
  try {
    await $fetch(`${host}/i/v0/e/`, {
      method: 'POST',
      body: buildPostHogBusinessPayload(input, projectToken),
      timeout: 2_000,
    })
    return true
  }
  catch (error) {
    console.warn('[posthog-business] event delivery failed', {
      event: input.event,
      entityType: input.entityType,
      code: error instanceof Error ? error.name : 'unknown',
    })
    return false
  }
}
