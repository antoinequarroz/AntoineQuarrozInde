import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('Hermes weekly marketing report', () => {
  it('keeps the endpoint read-only and protected by the dedicated Hermes token', () => {
    const endpoint = read('server/api/hermes/marketing-report.get.ts')
    const report = read('server/utils/posthogMarketing.ts')
    expect(endpoint).toContain('requireHermesReadAccess(event)')
    expect(endpoint).toContain('buildPostHogMarketingReport')
    expect(report).toContain('schemaVersion: 1')
    expect(report).toContain('INTERVAL 7 DAY')
    expect(report).toContain("contact_form_abandoned")
    expect(report).toContain("sumIf(toInt64OrZero")
    expect(endpoint).not.toContain('getSupabaseAdmin')
  })

  it('exposes the same bounded report to an authenticated mobile device', () => {
    const endpoint = read('server/api/hermes/mobile/acquisition.get.ts')
    expect(endpoint).toContain('requireHermesMobileDevice(event)')
    expect(endpoint).toContain('buildPostHogMarketingReport')
    expect(endpoint).toContain("'private, no-store'")
  })

  it('renders a bounded report without exposing the token', () => {
    const script = read('scripts/hermes/fetch_marketing_report.py')
    expect(script).toContain("os.environ.get('HERMES_READ_TOKEN', '')")
    expect(script).toContain('MAX_BYTES = 200_000')
    expect(script).toContain('# Rapport marketing hebdomadaire FRIDAY')
    expect(script).not.toMatch(/[a-f0-9]{64}/)
  })
})
