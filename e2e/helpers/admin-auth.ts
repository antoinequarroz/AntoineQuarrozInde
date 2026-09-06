import { createHmac } from 'node:crypto'
import { expect, type Page } from '@playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD
const adminTotpSecret = process.env.E2E_ADMIN_TOTP_SECRET

export const adminCredentialsConfigured = Boolean(adminEmail && adminPassword)

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
