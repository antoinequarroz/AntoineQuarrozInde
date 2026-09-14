import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('client status concurrency contract', () => {
  it('validates status and guards conversion and undo with compare-and-set fields', async () => {
    const [endpoint, store] = await Promise.all([
      readFile('server/api/clients.put.ts', 'utf8'),
      readFile('app/stores/clients.ts', 'utf8'),
    ])
    expect(endpoint).toContain("const validStatuses = ['lead', 'active', 'inactive'] as const")
    expect(endpoint).toContain("updateQuery.eq('status', body.expectedStatus)")
    expect(endpoint).toContain("updateQuery.is('next_follow_up_at', null)")
    expect(endpoint).toContain("statusCode: 409")
    expect(store).toContain('expectedStatus: expected.status')
    expect(store).toContain('expectedNextFollowUpAt: expected.nextFollowUpAt')
  })
})
