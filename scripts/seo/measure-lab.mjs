import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { SEO_QUALITY_CONFIG } from './release-quality.config.mjs'
import { loadQualityWaiver } from './quality-waiver.mjs'

const baseUrl = process.argv[2]
const outputPath = resolve(process.argv[3] || '.artifacts/seo-quality/lab.json')
const gitSha = process.env.GITHUB_SHA || process.env.APP_VERSION || null

function safeOrigin(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash
      ? url.origin
      : null
  }
  catch { return null }
}

const origin = safeOrigin(baseUrl)
if (!origin) {
  console.error('Expected an HTTP(S) origin without credentials, path, query or fragment.')
  process.exit(64)
}

const browser = await chromium.launch({ headless: true })
const results = []
let failed = false

try {
  for (const path of SEO_QUALITY_CONFIG.labPaths) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    })
    await context.route(/(?:prod\.spline\.design|unpkg\.com\/\@splinetool)/, route => route.abort())
    const page = await context.newPage()
    await page.addInitScript(() => {
      window.__aqSeoVitals = { lcp: null, cls: 0 }
      try {
        new PerformanceObserver(list => {
          const entries = list.getEntries()
          const last = entries.at(-1)
          if (last) window.__aqSeoVitals.lcp = last.startTime
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__aqSeoVitals.cls += entry.value
          }
        }).observe({ type: 'layout-shift', buffered: true })
      }
      catch {}
    })

    const startedAt = Date.now()
    let response
    let error = null
    try {
      response = await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
      await page.waitForTimeout(1_000)
    }
    catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught)
    }

    const measured = error ? null : await page.evaluate(() => {
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null
      const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || null
      const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].filter(node => node.textContent?.trim()).length
      const navigation = performance.getEntriesByType('navigation')[0]
      return {
        title: document.title,
        h1: document.querySelector('h1')?.textContent?.trim() || null,
        canonical,
        robots,
        jsonLd,
        lcpMs: window.__aqSeoVitals?.lcp ?? null,
        cls: window.__aqSeoVitals?.cls ?? null,
        domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
      }
    })
    const status = response?.status() ?? null
    const violations = []
    if (error) violations.push('navigation-error')
    if (status !== 200) violations.push('http-status')
    const requiresJsonLd = SEO_QUALITY_CONFIG.structuredDataPaths.includes(path)
    if (!measured?.title || !measured?.h1 || !measured?.canonical || !measured?.robots || (requiresJsonLd && !measured?.jsonLd)) violations.push('initial-html')
    if (typeof measured?.lcpMs !== 'number') violations.push('lcp-unavailable')
    else if (measured.lcpMs > SEO_QUALITY_CONFIG.budgets.lcpMs) violations.push('lcp-budget')
    if (typeof measured?.cls !== 'number') violations.push('cls-unavailable')
    else if (measured.cls > SEO_QUALITY_CONFIG.budgets.cls) violations.push('cls-budget')
    if (violations.length) failed = true
    results.push({ path, status, elapsedMs: Date.now() - startedAt, error, ...measured, violations })
    await context.close()
  }
}
finally {
  await browser.close()
}

const waiver = failed ? await loadQualityWaiver('seo-lab', gitSha) : null
const waived = Boolean(waiver && !waiver.invalid)
const report = {
  schemaVersion: 1,
  profileVersion: SEO_QUALITY_CONFIG.profileVersion,
  generatedAt: new Date().toISOString(),
  gitSha,
  environment: { origin, viewport: '390x844', reducedMotion: true, splineBlocked: true },
  budgets: SEO_QUALITY_CONFIG.budgets,
  fieldInp: { status: 'not-applicable-lab', value: null },
  status: failed ? (waived ? 'waived' : 'failed') : 'passed',
  waiver,
  pages: results,
}
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(`SEO laboratory baseline ${report.status}: ${outputPath}`)
if (failed && !waived) process.exit(1)
