import { describe, expect, it } from 'vitest'
import { cockpitKind, cockpitPayload } from '../server/utils/projectCockpit'

describe('project cockpit payloads', () => {
  it('validates a time entry', () => {
    expect(cockpitPayload('time', { description: 'Intégration', minutes: 90, workedAt: '2026-08-09' })).toEqual({
      description: 'Intégration', minutes: 90, worked_at: '2026-08-09', task_id: null,
    })
  })

  it('rejects unknown item types', () => {
    expect(() => cockpitKind('invoice')).toThrow()
  })

  it('rejects unsafe deliverable URLs', () => {
    expect(() => cockpitPayload('deliverable', { title: 'Archive', url: 'javascript:alert(1)' })).toThrow()
  })
})
