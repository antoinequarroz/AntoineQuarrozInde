import { mkdir, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import { chromium, type FullConfig } from '@playwright/test'
import {
  adminCredentialsConfigured,
  adminStorageStatePath,
  loginAdmin,
} from './helpers/admin-auth'

export default async function globalSetup(config: FullConfig) {
  await rm(adminStorageStatePath, { force: true })
  const cleanup = () => rm(adminStorageStatePath, { force: true })
  if (!adminCredentialsConfigured) return cleanup

  const baseURL = String(config.projects[0]?.use.baseURL || process.env.E2E_BASE_URL || 'http://127.0.0.1:3100')
  await mkdir(dirname(adminStorageStatePath), { recursive: true })

  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()
    await loginAdmin(page)
    await context.storageState({ path: adminStorageStatePath })
  }
  catch (error) {
    await cleanup()
    throw error
  }
  finally {
    await browser.close()
  }

  return cleanup
}
