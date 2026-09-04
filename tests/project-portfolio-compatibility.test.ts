import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('project portfolio compatibility release', () => {
  it('preserves the legacy visible state until the rollback-safe image is live', async () => {
    const migration = await readFile(
      'supabase/migrations/20260903193214_add_project_portfolio_visibility.sql',
      'utf8',
    )

    expect(migration).toContain('set portfolio_visible = true')
    expect(migration).toContain('alter column portfolio_visible set default true')
    expect(migration).toContain('alter column portfolio_visible set not null')
    expect(migration).not.toMatch(/default false/i)
    expect(migration).not.toMatch(/drop\s+(table|column)/i)
  })

  it('makes the transition image understand the visibility field on every public read', async () => {
    const [publicApi, store, portfolio] = await Promise.all([
      readFile('server/api/projects.get.ts', 'utf8'),
      readFile('app/stores/projects.ts', 'utf8'),
      readFile('app/components/sections/PortfolioSection.vue', 'utf8'),
    ])

    expect(publicApi).toContain("query.or('portfolio_visible.eq.true,and(case_study_published.eq.true,case_study_approved_at.not.is.null)')")
    expect(store).toContain('portfolio_visible')
    expect(store).toContain('projects.value.filter(p => p.portfolioVisible)')
    expect(portfolio).toContain('store.portfolio')
  })
})
