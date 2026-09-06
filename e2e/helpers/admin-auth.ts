import { createHmac } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, type BrowserContext, type Page } from '@playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD
const adminTotpSecret = process.env.E2E_ADMIN_TOTP_SECRET
export const adminStorageStatePath = resolve(process.cwd(), 'playwright/.auth/admin.json')

export const adminCredentialsConfigured = Boolean(adminEmail && adminPassword)

type StoredBrowserState = Awaited<ReturnType<BrowserContext['storageState']>>

async function restoreAdminStorageState(page: Page) {
  if (!existsSync(adminStorageStatePath)) return false

  const state = JSON.parse(readFileSync(adminStorageStatePath, 'utf8')) as StoredBrowserState
  if (Array.isArray(state.cookies) && state.cookies.length > 0) {
    await page.context().addCookies(state.cookies)
  }

  const origins = Array.isArray(state.origins) ? state.origins : []
  await page.goto('/')
  const savedOrigin = origins.find(candidate => candidate.origin === new URL(page.url()).origin)
  if (savedOrigin?.localStorage?.length) {
    await page.evaluate((entries) => {
      for (const entry of entries) localStorage.setItem(entry.name, entry.value)
    }, savedOrigin.localStorage)
  }

  await page.goto('/admin')
  const dashboardHeading = page.getByRole('heading', { name: 'Tableau de bord', exact: true })
  await Promise.race([
    dashboardHeading.waitFor({ state: 'visible', timeout: 10_000 }),
    page.waitForURL(url => /^\/admin\/(?:security|login)\/?$/.test(url.pathname), { timeout: 10_000 }),
  ])
  return new URL(page.url()).pathname.replace(/\/$/, '') === '/admin' && await dashboardHeading.isVisible()
}

function decodeBase32(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const normalized = value.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '')
  if (!normalized || [...normalized].some(character => !alphabet.includes(character))) {
    throw new Error('E2E_ADMIN_TOTP_SECRET must be a valid Base32 secret.')
  }

  let bits = ''
  for (const character of normalized) {
    bits += alphabet.indexOf(character).toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }
  const decoded = Buffer.from(bytes)
  if (decoded.length < 10) throw new Error('E2E_ADMIN_TOTP_SECRET must be a valid Base32 secret.')
  return decoded
}

export function generateTotpCode(secret: string, timestampMs = Date.now()) {
  const counter = Math.floor(timestampMs / 30_000)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter))

  const digest = createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest()
  const offset = digest[digest.length - 1]! & 0x0f
  const binary = (digest.readUInt32BE(offset) & 0x7fff_ffff) % 1_000_000
  return binary.toString().padStart(6, '0')
}

export async function loginAdmin(page: Page) {
  if (!adminEmail || !adminPassword) {
    throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required.')
  }

  if (await restoreAdminStorageState(page)) return

  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(adminEmail)
  await page.getByLabel(/mot de passe/i).fill(adminPassword)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForURL(url => /^\/admin(?:\/security)?\/?$/.test(url.pathname))

  if (new URL(page.url()).pathname === '/admin/security') {
    const challengeCode = page.getByLabel('Code à six chiffres')
    await expect(challengeCode).toBeVisible()
    if (!adminTotpSecret) {
      throw new Error('This admin account requires MFA. Configure E2E_ADMIN_TOTP_SECRET with its Base32 TOTP secret.')
    }

    const remainingWindowMs = 30_000 - (Date.now() % 30_000)
    if (remainingWindowMs < 5_000) await page.waitForTimeout(remainingWindowMs + 250)
    await challengeCode.fill(generateTotpCode(adminTotpSecret))
    await page.getByRole('button', { name: 'Vérifier et continuer' }).click()
  }

  await expect(page).toHaveURL(/\/admin(?:\/)?$/)
}
