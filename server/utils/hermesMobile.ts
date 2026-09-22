import { createHash, randomBytes } from 'node:crypto'
import { createError } from 'h3'

export const HERMES_MOBILE_MAX_BYTES = 128 * 1024

function invalid(): never {
  throw createError({ statusCode: 400, message: 'Instantané Hermes invalide.' })
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  return value as Record<string, unknown>
}

function text(value: unknown, max = 240): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) invalid()
  return value.trim()
}

function optionalText(value: unknown, max = 240): string | null {
  if (value === null || value === undefined || value === '') return null
  return text(value, max)
}

function isoDate(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const date = text(value, 40)
  if (Number.isNaN(Date.parse(date))) invalid()
  return new Date(date).toISOString()
}

function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) invalid()
  return value
}

export function validateHermesMobileSnapshot(value: unknown) {
  const data = object(value)
  if (data.schemaVersion !== 1) invalid()
  const projects = list(data.projects, 150).map((item) => {
    const row = object(item)
    return { id: text(row.id, 180), label: text(row.label, 180), parentId: optionalText(row.parentId, 180), archived: row.archived === true }
  })
  const profiles = list(data.profiles, 40).map((item) => {
    const row = object(item)
    return { name: text(row.name, 120), label: text(row.label, 180), model: optionalText(row.model, 180), provider: optionalText(row.provider, 100) }
  })
  const missions = list(data.missions, 300).map((item) => {
    const row = object(item)
    return {
      id: text(row.id, 180), title: text(row.title, 260), owner: text(row.owner, 120), projectId: optionalText(row.projectId, 180),
      status: text(row.status, 120), lastStatus: optionalText(row.lastStatus, 120), nextRunAt: optionalText(row.nextRunAt, 80),
    }
  })
  const reviews = list(data.reviews, 200).map((item) => {
    const row = object(item)
    const decision = text(row.decision, 40)
    if (!['À relire', 'À reprendre', 'Relu'].includes(decision)) invalid()
    const contentVersion = optionalText(row.contentVersion, 64)
    if (contentVersion && !/^[0-9a-f]{64}$/.test(contentVersion)) invalid()
    return {
      id: text(row.id, 180), title: text(row.title, 260), projectId: optionalText(row.projectId, 180), decision,
      addedAt: isoDate(row.addedAt), contentVersion, digest: contentVersion, excerpt: optionalText(row.excerpt, 400),
    }
  })
  const projectIds = new Set(projects.map(item => item.id))
  if (projectIds.size !== projects.length || profiles.length !== new Set(profiles.map(item => item.name)).size
    || missions.length !== new Set(missions.map(item => item.id)).size || reviews.length !== new Set(reviews.map(item => item.id)).size
    || projects.some(item => item.parentId && !projectIds.has(item.parentId))
    || missions.some(item => item.projectId && !projectIds.has(item.projectId))
    || reviews.some(item => item.projectId && !projectIds.has(item.projectId))) invalid()
  return { schemaVersion: 1 as const, sourceFetchedAt: isoDate(data.sourceFetchedAt), projects, profiles, missions, reviews }
}

export function createHermesMobileToken() {
  return `hcm_${randomBytes(32).toString('base64url')}`
}

export function hashHermesMobileToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function validateHermesMobileToken(value: string | undefined) {
  if (!value?.startsWith('Bearer hcm_')) return null
  const token = value.slice('Bearer '.length)
  return /^hcm_[A-Za-z0-9_-]{43}$/.test(token) ? token : null
}
