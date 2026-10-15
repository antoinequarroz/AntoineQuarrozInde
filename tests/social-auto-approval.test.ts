import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { validateAutomaticSocialPost, validateExpectedVersion, validateSocialApprovalMode, validateSocialContent } from '../server/utils/socialPublication'
let results: any[]
let calls: { name: string, args: any[] }[]
const image = { url: 'https://www.antoinequarroz.ch/social/a.jpg', alt: 'Accueil' }
beforeEach(() => {
  calls = []
  results = [{ data: { platform: 'linkedin', status: 'draft', publication_mode: 'manual', article_url: 'https://www.antoinequarroz.ch/', media_images: [image] } }, { data: [{ id: 'post', status: 'approved', publication_mode: 'automatic', approved_version: 4, version: 4 }] }]
  const db: any = new Proxy({}, { get: (_, name: string) => name === 'then' ? (resolve: any) => resolve(results.shift()) : (...args: any[]) => { calls.push({ name, args }); return db } })
  vi.stubGlobal('defineEventHandler', (handler: any) => handler)
  vi.stubGlobal('getSupabaseAdmin', () => db)
  vi.stubGlobal('requireAdmin', () => ({ user: { id: 'u' }, org: { id: 'org' } }))
  vi.stubGlobal('requireHermesPublishAccess', () => undefined)
  vi.stubGlobal('resolveHermesOrganization', () => ({ id: 'org' }))
  vi.stubGlobal('readJsonBodyLimited', (event: any) => event.body)
  vi.stubGlobal('getRouterParam', () => 'post')
  vi.stubGlobal('createError', (options: any) => Object.assign(new Error(options.message), options))
  vi.stubGlobal('validateExpectedVersion', validateExpectedVersion)
  vi.stubGlobal('validateSocialApprovalMode', validateSocialApprovalMode)
  vi.stubGlobal('validateAutomaticSocialPost', validateAutomaticSocialPost)
  vi.stubGlobal('validateSocialContent', validateSocialContent)
  vi.stubGlobal('SOCIAL_PUBLISH_NOW_CONFIRMATION', 'PUBLIER_MAINTENANT')
  vi.stubGlobal('SOCIAL_SCHEDULE_CONFIRMATION', 'PROGRAMMER_POUR_18H')
  vi.stubGlobal('MAX_SOCIAL_REQUEST_BYTES', 16384)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { supabaseUrl: '' } }))
  vi.stubGlobal('cleanSocialError', (v: any) => String(v))
  vi.stubGlobal('logAudit', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())
const body = { version: 3, content: 'Texte https://www.antoinequarroz.ch/', mode: 'now', confirmation: 'PUBLIER_MAINTENANT' }
it('requires explicit publication consent before any database write', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/approve.post')
  await expect(handler({ body: { ...body, confirmation: 'VALIDER_TEXTE_ET_VISUELS' } } as any)).rejects.toThrow(/explicite/)
  expect(calls).toEqual([])
})
it('uses atomic tenant/version approval RPC for the current saved media snapshot', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/approve.post')
  await handler({ body: { ...body, organization_id: 'other', media_images: [] } } as any)
  expect(calls.find(c => c.name === 'rpc')!.args).toEqual(['approve_social_post', expect.objectContaining({ p_organization_id: 'org', p_post_id: 'post', p_expected_version: 3, p_content: body.content })])
  expect(calls.some(c => c.name === 'update')).toBe(false)
})
it('lets the user explicitly upgrade a manual review, without grandfathering it', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/approve.post')
  results[0].data.status = 'approved'
  await handler({ body } as any)
  expect(calls.some(c => c.name === 'rpc')).toBe(true)
})
it('rejects a stale version and records no approval audit', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/approve.post')
  results[1].data = []
  await expect(handler({ body } as any)).rejects.toThrow(/changé/)
  expect(logAudit).not.toHaveBeenCalled()
})
it('requires saved JPEG images for Instagram but no clickable link in its caption', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/approve.post')
  results[0].data.platform = 'instagram'
  await handler({ body: { ...body, content: 'Une légende Instagram' } } as any)
  expect(calls.find(c => c.name === 'rpc')!.args[1].p_content).toBe('Une légende Instagram')
})
it('does not authorize Instagram text-only or unsupported media', () => {
  expect(() => validateAutomaticSocialPost({ platform: 'instagram', media_images: [] })).toThrow(/image/)
  expect(() => validateAutomaticSocialPost({ platform: 'instagram', media_images: [{ ...image, url: image.url.replace('.jpg', '.png') }] })).toThrow(/JPEG/)
})
it('reports a preflight block while retaining the current approval and version', async () => {
  const { default: handler } = await import('../server/api/hermes/social-publications.post')
  results = [{ data: { id: 'post', status: 'approved', version: 3 } }]
  await handler({ body: { action: 'preflight_fail', id: 'post', version: 3, error: 'Image indisponible' } } as any)
  const update = calls.find(c => c.name === 'update')!.args[0]
  expect(update).toMatchObject({ last_error: 'Image indisponible' })
  for (const field of ['status', 'version', 'publication_mode', 'approval_fingerprint']) expect(update).not.toHaveProperty(field)
  expect(calls.filter(c => c.name === 'eq').map(c => c.args)).toEqual(expect.arrayContaining([['organization_id', 'org'], ['status', 'approved'], ['version', 3], ['publication_mode', 'automatic']]))
})

it('records a confirmed Instagram ID as published even when the permalink lookup failed', async () => {
  const { default: handler } = await import('../server/api/hermes/social-publications.post')
  results = [{ data: { platform: 'instagram' } }, { data: { id: 'post', status: 'published', version: 5 } }]
  await handler({ body: { action: 'complete', id: 'post', version: 4, externalPostId: '17841434338571820', externalPostUrl: null } } as any)
  expect(calls.find(c => c.name === 'update')!.args[0]).toMatchObject({ status: 'published', external_post_url: null })
})
it('refuses a missing LinkedIn receipt URL rather than inventing success', async () => {
  const { default: handler } = await import('../server/api/hermes/social-publications.post')
  results = [{ data: { platform: 'linkedin' } }]
  await expect(handler({ body: { action: 'complete', id: 'post', version: 4, externalPostId: 'urn:li:share:123', externalPostUrl: null } } as any)).rejects.toThrow(/Reçu/)
  expect(calls.some(c => c.name === 'update')).toBe(false)
})
