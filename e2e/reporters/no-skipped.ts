import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'

type SafeFailure = {
  title: string
  status: TestResult['status']
  retry: number
  durationMs: number
}

type SafeFailureReport = {
  version: 1
  status: 'failed'
  failures: SafeFailure[]
  skipped: string[]
}

function writeSafeFailureReport(report: SafeFailureReport) {
  const outputPath = resolve(process.cwd(), 'test-results/safe-failure-report.json')
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 })
}

export default class NoSkippedReporter implements Reporter {
  private skipped: string[] = []
  private failures: SafeFailure[] = []
  private readonly persistReport: (report: SafeFailureReport) => void

  constructor(options: { persistReport?: (report: SafeFailureReport) => void } = {}) {
    this.persistReport = options.persistReport || writeSafeFailureReport
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const title = test.titlePath().filter(Boolean).join(' › ')
    if (result.status === 'skipped') this.skipped.push(title)
    if (['failed', 'timedOut', 'interrupted'].includes(result.status)) {
      this.failures.push({
        title,
        status: result.status,
        retry: result.retry,
        durationMs: result.duration,
      })
    }
  }

  onEnd(result: FullResult) {
    const status = this.skipped.length ? 'failed' as const : result.status

    if (status !== 'passed') {
      this.persistReport({
        version: 1,
        status: 'failed',
        failures: this.failures,
        skipped: this.skipped,
      })
    }

    if (!this.skipped.length) return { status }

    console.error(`E2E delivery gate rejected ${this.skipped.length} skipped test(s):`)
    for (const title of this.skipped) console.error(`- ${title}`)
    return { status: 'failed' as const }
  }
}
