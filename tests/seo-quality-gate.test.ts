import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { SEO_QUALITY_CONFIG } from '../scripts/seo/release-quality.config.mjs'

describe('AQ-SEO-014 release quality gate', () => {
  it('versions the approved pages and Web Vitals budgets', () => {
    expect(SEO_QUALITY_CONFIG.budgets).toEqual({ lcpMs: 2500, inpMs: 200, cls: 0.1 })
    expect(SEO_QUALITY_CONFIG.criticalPaths).toContain('/')
    expect(SEO_QUALITY_CONFIG.criticalPaths).toContain('/en')
    expect(SEO_QUALITY_CONFIG.criticalPaths).toContain('/de')
    expect(SEO_QUALITY_CONFIG.criticalPaths).toContain('/blog')
    expect(SEO_QUALITY_CONFIG.criticalPaths).toContain('/cas-clients-valais')
  })

  it('keeps every public proof inside the VPS rollback transaction', async () => {
    const [release, proof] = await Promise.all([
      readFile('scripts/ops/deploy-release.sh', 'utf8'),
      readFile('scripts/ops/verify-seo-release.sh', 'utf8'),
    ])
    const call = 'bash scripts/ops/verify-seo-release.sh "$APP_VERSION"'
    expect(release).toContain(call)
    expect(release.indexOf('trap rollback ERR')).toBeLessThan(release.indexOf(call))
    expect(release.indexOf('trap - ERR', release.indexOf(call))).toBeGreaterThan(release.indexOf(call))
    for (const name of ['production-release', 'domain-canonicalization', 'openai-robots-policy', 'localized-pages', 'sitemap-discovery', 'blog-posting', 'service-breadcrumbs', 'approved-case-studies']) {
      expect(proof).toContain(`verify-${name}.sh`)
    }
  })

  it('records field unavailability and preserves evidence in CI', async () => {
    const [field, workflow] = await Promise.all([
      readFile('scripts/seo/collect-field-data.mjs', 'utf8'),
      readFile('.github/workflows/ci.yml', 'utf8'),
    ])
    expect(field).toContain("status: apiKey ? 'error' : 'not-configured'")
    expect(field).toContain("'insufficient-data'")
    expect(workflow).toContain('CRUX_API_KEY: ${{ secrets.CRUX_API_KEY }}')
    expect(workflow).toContain('if: always()')
    expect(workflow).toContain('seo-quality-${{ github.sha }}')
    expect(workflow).toContain('\n  seo-quality:')
    expect(workflow).toContain('npm run quality:seo:lab -- http://127.0.0.1:3100')
    expect(workflow).toContain('npm run quality:seo:lab -- "$E2E_BASE_URL"')
    expect(workflow).toContain('for attempt in 1 2 3; do')
    expect(workflow).toContain('if [ "$attempt" -eq 3 ]; then')
  })
})
