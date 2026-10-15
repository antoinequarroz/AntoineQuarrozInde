import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateInstagramDrafts, validateInstagramSnapshot } from '../server/utils/instagramSync'
import { SOCIAL_INSTAGRAM_REVIEW_CONFIRMATION, validateExpectedVersion, validateSocialContent } from '../server/utils/socialPublication'

const calls: { name: string, args: any[] }[] = []
let result: any
let db: any
beforeEach(() => {
  calls.length = 0
  result = { data: null, error: null }
  db = new Proxy({}, { get: (_target, name: string) => {
    if (name === 'then') return (resolve: any) => resolve(result)
    return (...args: any[]) => { calls.push({ name, args }); return db }
  } })
  vi.stubGlobal('defineEventHandler', (handler: any) => handler)
  vi.stubGlobal('getSupabaseAdmin', () => db)
  vi.stubGlobal('requireHermesPublishAccess', () => undefined)
  vi.stubGlobal('resolveHermesOrganization', () => ({ id: 'allowed-org' }))
  vi.stubGlobal('requireAdmin', () => ({ user: { id: 'user' }, org: { id: 'allowed-org' } }))
  vi.stubGlobal('readJsonBodyLimited', (event: any) => event.body)
  vi.stubGlobal('getRouterParam', () => 'post-id')
  vi.stubGlobal('createError', (options: any) => Object.assign(new Error(options.message), options))
  vi.stubGlobal('validateInstagramDrafts', validateInstagramDrafts)
  vi.stubGlobal('validateInstagramSnapshot', validateInstagramSnapshot)
  vi.stubGlobal('validateExpectedVersion', validateExpectedVersion)
  vi.stubGlobal('validateSocialContent', validateSocialContent)
  vi.stubGlobal('SOCIAL_INSTAGRAM_REVIEW_CONFIRMATION', SOCIAL_INSTAGRAM_REVIEW_CONFIRMATION)
  vi.stubGlobal('MAX_SOCIAL_REQUEST_BYTES', 16384)
  vi.stubGlobal('logAudit', vi.fn())
  vi.stubGlobal('setHeader', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

it('refuses an unauthenticated sync before touching the database', async () => {
  const { default: handler } = await import('../server/api/hermes/instagram-sync.post')
  vi.stubGlobal('requireHermesPublishAccess', () => { throw new Error('unauthorized') })
  await expect(handler({ body: {} } as any)).rejects.toThrow('unauthorized')
  expect(calls).toEqual([])
})
it('ignores the incoming tenant, status and version, and inserts conflicts without updates', async () => {
  const { default: handler } = await import('../server/api/hermes/instagram-sync.post')
  const time = new Date().toISOString()
  const body = { organization_id: 'foreign-org', snapshot: { schemaVersion: 1, expectedUsername: 'antoinequarroz.dev', state: 'unconfigured', readOnly: true, publishingEnabled: false,
    collectedAt: time, profile: null, period: null, metrics: {}, media: [], errors: [], chargedMicroUSD: 0 },
    drafts: [{ id: '12345678-0000-0000-0000-000000000001', caption: 'Texte du studio', status: 'approved', version: 42 }] }
  await handler({ body } as any)
  const upsert = calls.find(call => call.name === 'upsert')!
  expect(upsert.args[1].ignoreDuplicates).toBe(true)
  expect(upsert.args[0][0]).toMatchObject({ organization_id: 'allowed-org', status: 'draft', version: 1 })
  expect(calls.find(call => call.name === 'rpc')?.args[1].p_organization_id).toBe('allowed-org')
  expect(calls.some(call => call.name === 'update')).toBe(false)
})
it('validates text only with explicit consent, matching tenant, platform, status and version', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/review-instagram.post')
  await expect(handler({ body: { version: 7, content: 'Texte', confirmation: 'PUBLIER_MAINTENANT' } } as any)).rejects.toThrow(/explicite/)
  expect(calls).toEqual([])
  result.data = { id: 'post-id', status: 'approved', version: 8 }
  await handler({ body: { version: 7, content: 'Texte', confirmation: SOCIAL_INSTAGRAM_REVIEW_CONFIRMATION } } as any)
  expect(calls.filter(call => call.name === 'eq').map(call => call.args)).toEqual([
    ['organization_id', 'allowed-org'], ['id', 'post-id'], ['platform', 'instagram'], ['media_images', '[]'], ['version', 7],
  ])
  expect(calls.find(call => call.name === 'update')?.args[0]).toMatchObject({ status: 'approved', publish_after: null, version: 8 })
  expect(calls.find(call => call.name === 'in')?.args).toEqual(['status', ['draft', 'failed']])
})
it('does not report success for a conflicting version or a missing/foreign post', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/review-instagram.post')
  await expect(handler({ body: { version: 7, content: 'Texte', confirmation: SOCIAL_INSTAGRAM_REVIEW_CONFIRMATION } } as any)).rejects.toThrow(/a changé/)
  expect(vi.mocked(logAudit)).not.toHaveBeenCalled()
})
it('restricts snapshot reads to the authenticated tenant and never caches them publicly', async () => {
  const { default: handler } = await import('../server/api/admin/social-insights.get')
  await handler({} as any)
  expect(calls.filter(call => call.name === 'eq').map(call => call.args)).toEqual([['organization_id', 'allowed-org'], ['platform', 'instagram']])
  expect(setHeader).toHaveBeenCalledWith({}, 'Cache-Control', 'private, no-store')
})
