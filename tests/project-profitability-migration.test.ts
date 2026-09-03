import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../supabase/migrations/20260809175124_project_profitability.sql', import.meta.url), 'utf8')

describe('project profitability migration', () => {
  it('keeps quote and invoice project links inside the same organization', () => {
    expect(migration).toContain('foreign key (organization_id, project_id)')
    expect(migration.match(/references public\.projects\(organization_id, id\)/g)).toHaveLength(2)
  })

  it('keeps financial values non-negative and private by default', () => {
    expect(migration).toContain('check (budget_cents >= 0)')
    expect(migration).toContain('check (internal_hourly_cost_cents >= 0)')
    expect(migration).not.toMatch(/grant\s+.+\s+to\s+(anon|authenticated)/i)
  })
})
