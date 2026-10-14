import type { InstagramSnapshot } from '../../shared/types/socialInsights'

const USERNAME = 'antoinequarroz.dev'
const ACCOUNT_ID = '17841434338571820'
const STATES = ['connected', 'partial', 'error', 'unconfigured', 'wrong_account', 'permission_required'] as const
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function invalid(): never { throw new Error('Relevé Instagram incompatible. Aucun import effectué.') }
function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid()
  return value as Record<string, any>
}
function metric(value: unknown): number | null {
  if (value == null) return null
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 1e12) return invalid()
  return Number(value)
}
function timestamp(value: unknown, now: Date): string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value)) return invalid()
  const time = Date.parse(value)
  if (!Number.isFinite(time) || time > now.getTime() + 300_000) return invalid()
  return new Date(time).toISOString()
}

/** Allowlist the collector DTO. Never store upstream headers, paging URLs,
 * OAuth tokens, error bodies or another account in the website database. */
export function validateInstagramSnapshot(value: unknown, now = new Date()): InstagramSnapshot {
  const data = object(value)
  if (data.schemaVersion !== 1 || data.expectedUsername !== USERNAME || data.readOnly !== true
      || data.publishingEnabled !== false || data.chargedMicroUSD !== 0 || !STATES.includes(data.state)) return invalid()
  const collectedAt = timestamp(data.collectedAt, now)
  const lastSuccessfulAt = data.lastSuccessfulAt == null ? null : timestamp(data.lastSuccessfulAt, now)
  if (lastSuccessfulAt && lastSuccessfulAt > collectedAt) return invalid()
  const period = data.period == null ? null : object(data.period)
  const normalizedPeriod = period ? { from: timestamp(period.from, now), to: timestamp(period.to, now) } : null
  // Fourteen complete local calendar days can span 335, 336 or 337 hours.
  if (normalizedPeriod) {
    const hours = (Date.parse(normalizedPeriod.to) - Date.parse(normalizedPeriod.from)) / 3_600_000
    const day = (time: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(time))
    if (![335, 336, 337].includes(hours) || day(normalizedPeriod.from) !== '00:00:00' || day(normalizedPeriod.to) !== '00:00:00' || normalizedPeriod.to > collectedAt) return invalid()
  }
  const profile = data.profile == null ? null : object(data.profile)
  if (profile && (profile.id !== ACCOUNT_ID || profile.username !== USERNAME)) return invalid()
  if (['connected', 'partial'].includes(data.state) && (!profile || !normalizedPeriod)) return invalid()
  const metrics = object(data.metrics)
  if (!Array.isArray(data.media) || data.media.length > 10 || !Array.isArray(data.errors)) return invalid()
  const media = data.media.map((value: unknown) => {
    const item = object(value)
    if (typeof item.id !== 'string' || !/^\d{1,30}$/.test(item.id) || typeof item.caption !== 'string'
        || item.caption.length > 300 || !['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'].includes(item.type)) return invalid()
    let url: URL
    try { url = new URL(item.url) } catch { return invalid() }
    if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname)
        || url.username || url.password || url.port || url.search || url.hash
        || !/^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) return invalid()
    return { id: item.id, caption: item.caption, type: item.type, url: url.href,
      publishedAt: item.publishedAt == null ? null : timestamp(item.publishedAt, now), likes: metric(item.likes), comments: metric(item.comments) }
  })
  return {
    schemaVersion: 1, expectedUsername: USERNAME, state: data.state, readOnly: true, publishingEnabled: false,
    collectedAt, lastSuccessfulAt, period: normalizedPeriod,
    profile: profile ? { id: ACCOUNT_ID, username: USERNAME, followers: metric(profile.followers), mediaCount: metric(profile.mediaCount) } : null,
    metrics: { reach: metric(metrics.reach), accounts_engaged: metric(metrics.accounts_engaged), total_interactions: metric(metrics.total_interactions) }, media,
    // Error details remain on the Mac; only a safe, actionable summary is served.
    errors: data.errors.length ? ['Lecture Instagram incomplète. Vérifier la connexion et les permissions dans Hermes ; les valeurs absentes restent inconnues.'] : [],
    chargedMicroUSD: 0,
  }
}

export function validateInstagramDrafts(value: unknown) {
  if (!Array.isArray(value) || value.length > 20) return invalid()
  const ids = new Set<string>()
  return value.map((value: unknown) => {
    const draft = object(value)
    if (typeof draft.id !== 'string' || !UUID.test(draft.id) || ids.has(draft.id)
        || typeof draft.caption !== 'string' || !draft.caption.trim() || [...draft.caption.trim()].length > 2200) return invalid()
    ids.add(draft.id)
    const content = draft.caption.trim()
    return { platform: 'instagram', source_key: `studio-instagram:${draft.id.toLowerCase()}`,
      article_title: [...(content.split('\n')[0] || 'Brouillon Instagram du studio')].slice(0, 180).join(''),
      article_url: 'https://www.antoinequarroz.ch/', content, status: 'draft', version: 1 }
  })
}

export function studioInstagramContentId(sourceKey: unknown) {
  if (typeof sourceKey !== 'string' || !sourceKey.startsWith('studio-instagram:')) return null
  const id = sourceKey.slice('studio-instagram:'.length)
  return UUID.test(id) ? id : null
}
