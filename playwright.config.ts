import { defineConfig, devices } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const e2eEnvPaths = [resolve(process.cwd(), '.env.e2e'), resolve(process.cwd(), '.env')]

for (const e2eEnvPath of e2eEnvPaths) {
  if (!existsSync(e2eEnvPath)) continue
  for (const rawLine of readFileSync(e2eEnvPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue

    const name = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
    if (name.startsWith('E2E_') && process.env[name] === undefined) process.env[name] = value
  }
}

const externalBaseUrl = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['github'], ['./e2e/reporters/no-skipped.ts']]
    : 'list',
  use: {
    baseURL: externalBaseUrl || 'http://127.0.0.1:3100',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /mobile-admin\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-admin',
      testMatch: /(?:mobile-admin|business-flow)\.spec\.ts/,
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npx nuxt dev --port=3100 --host=127.0.0.1',
        url: 'http://127.0.0.1:3100/',
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
})
