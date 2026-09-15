import { describe, expect, it, vi } from 'vitest'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FullResult, TestCase, TestResult } from '@playwright/test/reporter'
import NoSkippedReporter from '../e2e/reporters/no-skipped'

const fullResult = (status: FullResult['status']): FullResult => ({
  status,
  startTime: new Date(0),
  duration: 1,
})

describe('NoSkippedReporter', () => {
  it('preserves a successful run with no skipped tests', () => {
    const persist = vi.fn()
    const reporter = new NoSkippedReporter({ persistReport: persist })
    expect(reporter.onEnd(fullResult('passed'))).toEqual({ status: 'passed' })
    expect(persist).not.toHaveBeenCalled()
  })

  it('fails the delivery gate when Playwright skips a test', () => {
    const persist = vi.fn()
    const reporter = new NoSkippedReporter({ persistReport: persist })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    reporter.onTestEnd({ titlePath: () => ['mobile-admin', 'MFA'] } as TestCase, {
      status: 'skipped', retry: 0, duration: 1,
    } as TestResult)

    expect(reporter.onEnd(fullResult('passed'))).toEqual({ status: 'failed' })
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', skipped: ['mobile-admin › MFA'] }))
    expect(error).toHaveBeenCalledWith('E2E delivery gate rejected 1 skipped test(s):')
    error.mockRestore()
  })

  it('persists only allowlisted diagnostics for a failed authenticated test', () => {
    const persist = vi.fn()
    const reporter = new NoSkippedReporter({ persistReport: persist })
    reporter.onTestEnd({ titlePath: () => ['mobile-admin', 'real MFA'] } as TestCase, {
      status: 'failed', retry: 1, duration: 42,
      errors: [{ message: 'password=do-not-persist token=do-not-persist' }],
    } as TestResult)

    expect(reporter.onEnd(fullResult('failed'))).toEqual({ status: 'failed' })
    const serialized = JSON.stringify(persist.mock.calls[0]?.[0])
    expect(serialized).toContain('real MFA')
    expect(serialized).not.toContain('do-not-persist')
    expect(persist).toHaveBeenCalledWith({
      version: 1,
      status: 'failed',
      failures: [{ title: 'mobile-admin › real MFA', status: 'failed', retry: 1, durationMs: 42 }],
      skipped: [],
    })
  })

  it('disables raw browser artifacts in every authenticated spec', async () => {
    const e2eDir = join(process.cwd(), 'e2e')
    const specs = (await readdir(e2eDir)).filter(file => file.endsWith('.spec.ts'))
    const unsafe: string[] = []

    for (const spec of specs) {
      const source = await readFile(join(e2eDir, spec), 'utf8')
      if (!source.includes('loginAdmin') && !source.includes('requireAdminCredentials')) continue
      if (!source.includes("test.use({ trace: 'off', screenshot: 'off', video: 'off' })")) unsafe.push(spec)
    }

    expect(unsafe, 'authenticated specs must never emit raw traces, screenshots or videos').toEqual([])
  })
})
