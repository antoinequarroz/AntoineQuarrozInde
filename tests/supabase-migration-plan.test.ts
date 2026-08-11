import { describe, expect, it } from 'vitest'
import { parseSupabaseMigrationList } from '../shared/utils/supabaseMigrationPlan'

function table(rows: Array<[string, string]>) {
  return [
    '  Local          | Remote         | Time (UTC)',
    ' ----------------|----------------|---------------------',
    ...rows.map(([local, remote]) => `  ${local.padEnd(14)} | ${remote.padEnd(14)} | 2026-08-10 00:00:00`),
  ].join('\n')
}

describe('Supabase migration promotion plan', () => {
  it('recognizes aligned histories', () => {
    const plan = parseSupabaseMigrationList(table([
      ['20260801000000', '20260801000000'],
      ['20260802000000', '20260802000000'],
    ]))

    expect(plan).toMatchObject({ status: 'aligned', pendingVersions: [], remoteOnlyVersions: [] })
  })

  it('returns only the chronological local suffix as pending', () => {
    const plan = parseSupabaseMigrationList(table([
      ['20260801000000', '20260801000000'],
      ['20260802000000', ''],
      ['20260803000000', ''],
    ]))

    expect(plan.status).toBe('pending')
    expect(plan.pendingVersions).toEqual(['20260802000000', '20260803000000'])
  })

  it('fails closed on remote-only and out-of-order local histories', () => {
    const remoteOnly = parseSupabaseMigrationList(table([
      ['20260801000000', '20260801000000'],
      ['', '20260802000000'],
    ]))
    expect(remoteOnly).toMatchObject({ status: 'diverged', remoteOnlyVersions: ['20260802000000'] })

    const outOfOrder = parseSupabaseMigrationList(table([
      ['20260801000000', ''],
      ['20260802000000', '20260802000000'],
    ]))
    expect(outOfOrder).toMatchObject({ status: 'diverged', outOfOrderLocalVersions: ['20260801000000'] })
  })

  it('accepts the unicode table separator and rejects malformed version rows', () => {
    expect(parseSupabaseMigrationList([
      ' Local          │ Remote',
      ' 20260801000000 │ 20260801000000',
    ].join('\n')).status).toBe('aligned')

    expect(() => parseSupabaseMigrationList('Local | Remote\n2026080100000x | 20260801000000'))
      .toThrow(/Invalid Supabase migration version row/)
    expect(() => parseSupabaseMigrationList('Connected to remote database.'))
      .toThrow(/header is missing/)
  })
})
