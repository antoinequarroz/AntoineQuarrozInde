import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { SEO_QUALITY_CONFIG } from './release-quality.config.mjs'
import { loadQualityWaiver } from './quality-waiver.mjs'

const origin = process.argv[2] || 'https://www.antoinequarroz.ch'
const outputPath = resolve(process.argv[3] || '.artifacts/seo-quality/field.json')
const apiKey = String(process.env.CRUX_API_KEY || '').trim()
const gitSha = process.env.GITHUB_SHA || process.env.APP_VERSION || null
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  origin,
  formFactor: 'PHONE',
  budgets: SEO_QUALITY_CONFIG.budgets,
  status: apiKey ? 'error' : 'not-configured',
  metrics: { lcpMs: null, inpMs: null, cls: null },
  violations: [],
}

try {
  const parsed = new URL(origin)
  if (parsed.protocol !== 'https:' || parsed.origin !== origin || parsed.username || parsed.password) throw new Error('Expected an HTTPS origin.')
  if (apiKey) {
    const response = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        origin,
        formFactor: 'PHONE',
        metrics: ['largest_contentful_paint', 'interaction_to_next_paint', 'cumulative_layout_shift'],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (response.status === 404) report.status = 'insufficient-data'
    else if (!response.ok) report.status = 'error'
    else {
      const payload = await response.json()
      const metrics = payload.record?.metrics || {}
      report.metrics = {
        lcpMs: Number(metrics.largest_contentful_paint?.percentiles?.p75 ?? NaN),
        inpMs: Number(metrics.interaction_to_next_paint?.percentiles?.p75 ?? NaN),
        cls: Number(metrics.cumulative_layout_shift?.percentiles?.p75 ?? NaN),
      }
      for (const key of Object.keys(report.metrics)) if (!Number.isFinite(report.metrics[key])) report.metrics[key] = null
      report.status = Object.values(report.metrics).every(value => value === null) ? 'insufficient-data' : 'available'
      if (report.metrics.lcpMs !== null && report.metrics.lcpMs > report.budgets.lcpMs) report.violations.push('lcp-budget')
      if (report.metrics.inpMs !== null && report.metrics.inpMs > report.budgets.inpMs) report.violations.push('inp-budget')
      if (report.metrics.cls !== null && report.metrics.cls > report.budgets.cls) report.violations.push('cls-budget')
    }
  }
}
catch (error) {
  report.status = 'error'
  report.error = error instanceof Error ? error.message : String(error)
}

await mkdir(dirname(outputPath), { recursive: true })
const waiver = report.violations.length ? await loadQualityWaiver('crux-field', gitSha) : null
if (waiver) report.waiver = waiver
if (report.violations.length && waiver && !waiver.invalid) report.status = 'waived'
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(`Core Web Vitals field data: ${report.status}.`)
if (report.violations.length && (!waiver || waiver.invalid)) process.exit(1)
