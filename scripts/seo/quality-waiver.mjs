import { readFile } from 'node:fs/promises'

export function validateQualityWaiver(value, control, now = new Date(), expectedSha = null) {
  const waiver = value && typeof value === 'object' ? value : {}
  const errors = []
  if (waiver.control !== control) errors.push('control')
  if (!/^[0-9a-f]{40}$/.test(String(waiver.failedSha || ''))) errors.push('failedSha')
  else if (expectedSha && waiver.failedSha !== expectedSha) errors.push('failedSha')
  if (String(waiver.reason || '').trim().length < 20) errors.push('reason')
  if (String(waiver.author || '').trim().length < 2) errors.push('author')
  const createdAt = new Date(String(waiver.createdAt || ''))
  const expiresAt = new Date(String(waiver.expiresAt || ''))
  if (!Number.isFinite(createdAt.getTime()) || createdAt > now) errors.push('createdAt')
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now || (Number.isFinite(createdAt.getTime()) && expiresAt.getTime() - createdAt.getTime() > 14 * 86_400_000)) errors.push('expiresAt')
  return { valid: errors.length === 0, errors }
}

export async function loadQualityWaiver(control, expectedSha = null) {
  const path = process.env.SEO_QUALITY_WAIVER_PATH || 'docs/releases/seo-quality-waiver.json'
  try {
    const waiver = JSON.parse(await readFile(path, 'utf8'))
    const validation = validateQualityWaiver(waiver, control, new Date(), expectedSha)
    return validation.valid
      ? { path, failedSha: waiver.failedSha, author: waiver.author, expiresAt: waiver.expiresAt }
      : { path, invalid: validation.errors }
  }
  catch (error) {
    if (error?.code === 'ENOENT') return null
    return { path, invalid: ['unreadable'] }
  }
}
