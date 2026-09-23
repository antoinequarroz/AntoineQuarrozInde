import { describe, expect, it } from 'vitest'
import { buildPostHogBusinessPayload } from '../server/utils/posthogBusiness'

describe('PostHog business events', () => {
  it('creates stable anonymous identifiers and keeps only safe properties', () => {
    const first = buildPostHogBusinessPayload({
      event: 'quote_accepted',
      organizationId: 'org-secret',
      entityType: 'quote',
      entityId: 42,
      clientId: 7,
      amountCents: 12_500,
      currency: 'chf',
      channel: 'campaign',
    }, 'phc_public')
    const second = buildPostHogBusinessPayload({
      event: 'quote_accepted',
      organizationId: 'org-secret',
      entityType: 'quote',
      entityId: 42,
      clientId: 7,
      amountCents: 12_500,
      currency: 'chf',
      channel: 'campaign',
    }, 'phc_public')

    expect(first).toEqual(second)
    expect(first.properties.distinct_id).toMatch(/^business:[a-f0-9]{64}$/)
    expect(first.properties.$insert_id).toMatch(/^[a-f0-9]{64}$/)
    expect(first.properties).toMatchObject({
      $host: 'www.antoinequarroz.ch',
      $process_person_profile: false,
      source_system: 'crm',
      entity_type: 'quote',
      amount_cents: 12_500,
      currency: 'CHF',
      channel: 'campaign',
    })
    expect(JSON.stringify(first)).not.toContain('org-secret')
  })

  it('drops unsupported dimensions instead of forwarding arbitrary data', () => {
    const payload = buildPostHogBusinessPayload({
      event: 'client_won',
      organizationId: 'org-secret',
      entityType: 'client',
      entityId: 7,
      amountCents: -1,
      currency: 'private@example.com',
      channel: 'custom-value',
    }, 'phc_public')

    expect(payload.properties).not.toHaveProperty('amount_cents')
    expect(payload.properties).not.toHaveProperty('currency')
    expect(payload.properties).not.toHaveProperty('channel')
  })
})
