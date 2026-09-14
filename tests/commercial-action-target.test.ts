import { describe, expect, it } from 'vitest'
import { parseCommercialActionTarget } from '../server/utils/commercialActionTarget'

describe('commercial action target', () => {
  it.each([
    ['lead:12', { kind: 'lead', sourceId: 12, occurrenceDate: null, table: 'clients', clientColumn: 'id' }],
    ['lead:12_2026-09-14', { kind: 'lead', sourceId: 12, occurrenceDate: '2026-09-14', table: 'clients', clientColumn: 'id' }],
    ['quote:8', { kind: 'quote', sourceId: 8, occurrenceDate: null, table: 'quotes', clientColumn: 'client_id' }],
    ['invoice:4', { kind: 'invoice', sourceId: 4, occurrenceDate: null, table: 'invoices', clientColumn: 'client_id' }],
    ['task:3', { kind: 'task', sourceId: 3, occurrenceDate: null, table: 'tasks', clientColumn: 'client_id' }],
  ])('maps %s to its tenant-scoped source', (actionKey, expected) => {
    expect(parseCommercialActionTarget(actionKey)).toEqual(expected)
  })

  it.each(['message:4', 'lead:0', 'lead:1_invalid', 'quote:8_2026-09-14', 'quote:-2', 'invoice:nope', 'lead:1:extra'])('rejects unsupported or invalid target %s', (actionKey) => {
    expect(parseCommercialActionTarget(actionKey)).toBeNull()
  })
})
