import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('PostHog data quality guardrails', () => {
  it('waits for a mature baseline and exposes attribution coverage', () => {
    const endpoint = read('server/api/admin/posthog-stats.get.ts')
    expect(endpoint).toContain('observationDays >= 14')
    expect(endpoint).toContain('utmCoveragePct')
    expect(endpoint).toContain('businessEventsClassified')
    expect(endpoint).toContain('Historique commercial à qualifier')
  })

  it('renders the three quality indicators in the admin dashboard', () => {
    const dashboard = read('app/pages/admin/analytics/index.vue')
    expect(dashboard).toContain('Période de référence')
    expect(dashboard).toContain('Trafic attribué par UTM')
    expect(dashboard).toContain('Événements métier classés')
  })
})
