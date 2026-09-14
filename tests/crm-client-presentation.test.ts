import { describe, expect, it } from 'vitest'
import type { Client } from '../app/types'
import { PIPELINE_PREVIEW_LIMIT, sortCrmProspects, visiblePipelineItems } from '../app/utils/crmClientPresentation'

function client(id: number, overrides: Partial<Client> = {}): Client {
  return {
    id,
    name: `Prospect ${id}`,
    company: null,
    email: `p${id}@example.com`,
    phone: null,
    status: 'lead',
    notes: null,
    billingStreet: null,
    billingBuilding: null,
    billingPostalCode: null,
    billingCity: null,
    billingCountry: 'CH',
    acquisitionSource: null,
    acquisitionMedium: null,
    acquisitionCampaign: null,
    nextFollowUpAt: null,
    followUpNote: null,
    lastContactedAt: null,
    createdAt: '2026-09-01',
    ...overrides,
  }
}

describe('CRM client presentation', () => {
  it('prioritizes due follow-ups, then score, and excludes clients', () => {
    const input = [
      client(1, { notes: 'score: 90' }),
      client(2, { notes: 'score: 40', nextFollowUpAt: '2026-09-13' }),
      client(3, { status: 'active', notes: 'score: 100' }),
      client(4, { notes: 'score: 75' }),
    ]
    expect(sortCrmProspects(input, 'priority', '2026-09-14').map(item => item.id)).toEqual([2, 1, 4])
  })

  it('applies distinct recent and name orders with stable tie-breakers', () => {
    const input = [
      client(2, { name: 'Alice', createdAt: '2026-09-10' }),
      client(1, { name: 'Zoé', createdAt: '2026-09-12' }),
    ]
    expect(sortCrmProspects(input, 'recent', '2026-09-14').map(item => item.id)).toEqual([1, 2])
    expect(sortCrmProspects(input, 'name', '2026-09-14').map(item => item.id)).toEqual([2, 1])
  })

  it('orders follow-ups chronologically and keeps future leads scoreable in priority mode', () => {
    const input = [
      client(1, { notes: 'score: 100' }),
      client(2, { notes: 'score: 10', nextFollowUpAt: '2026-09-20' }),
      client(3, { notes: 'score: 5', nextFollowUpAt: '2026-09-13' }),
    ]
    expect(sortCrmProspects(input, 'follow_up', '2026-09-14').map(item => item.id)).toEqual([3, 2, 1])
    expect(sortCrmProspects(input, 'priority', '2026-09-14').map(item => item.id)).toEqual([3, 1, 2])
  })

  it('does not mutate the source array', () => {
    const input = [client(2), client(1)]
    sortCrmProspects(input, 'name', '2026-09-14')
    expect(input.map(item => item.id)).toEqual([2, 1])
  })

  it('limits a collapsed pipeline column and reveals the complete list', () => {
    const input = Array.from({ length: PIPELINE_PREVIEW_LIMIT + 2 }, (_, index) => index)
    expect(visiblePipelineItems(input, false)).toHaveLength(PIPELINE_PREVIEW_LIMIT)
    expect(visiblePipelineItems(input, true)).toEqual(input)
  })
})
