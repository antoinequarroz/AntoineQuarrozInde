import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { validateExpectedVersion, validateSocialContent } from '../server/utils/socialPublication'
import { validateSocialImages, SOCIAL_MEDIA_REVIEW_CONFIRMATION } from '../server/utils/socialImages'
let results: any[]
let calls: { name: string, args: any[] }[]
const images = [{ url: 'https://www.antoinequarroz.ch/social/a.jpg', alt: 'Accueil' }]
beforeEach(() => {
  calls = []
  results = [{ data: { platform: 'linkedin', status: 'draft', media_kind: null, media_images: images } }, { data: { id: 'post', version: 4 } }]
  const db: any = new Proxy({}, { get: (_, name: string) => name === 'then' ? (resolve: any) => resolve(results.shift()) : (...args: any[]) => { calls.push({ name, args }); return db } })
  vi.stubGlobal('defineEventHandler', (handler: any) => handler)
  vi.stubGlobal('getSupabaseAdmin', () => db)
  vi.stubGlobal('requireAdmin', () => ({ user: { id: 'u' }, org: { id: 'org' } }))
  vi.stubGlobal('readJsonBodyLimited', (event: any) => event.body)
  vi.stubGlobal('getRouterParam', () => 'post')
  vi.stubGlobal('createError', (options: any) => Object.assign(new Error(options.message), options))
  vi.stubGlobal('validateExpectedVersion', validateExpectedVersion)
  vi.stubGlobal('validateSocialContent', validateSocialContent)
  vi.stubGlobal('validateSocialImages', validateSocialImages)
  vi.stubGlobal('SOCIAL_MEDIA_REVIEW_CONFIRMATION', SOCIAL_MEDIA_REVIEW_CONFIRMATION)
  vi.stubGlobal('MAX_SOCIAL_REQUEST_BYTES', 16384)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { supabaseUrl: '' } }))
  vi.stubGlobal('logAudit', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())
it('requires authentication before reading or updating images', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/images.put')
  vi.stubGlobal('requireAdmin', () => { throw new Error('unauthorized') })
  await expect(handler({ body: {} } as any)).rejects.toThrow('unauthorized')
  expect(calls).toEqual([])
})
it('updates only attachments in the authenticated tenant and matching draft version', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/images.put')
  await handler({ body: { version: 3, images, organization_id: 'other', status: 'approved' } } as any)
  const filters = calls.filter(call => call.name === 'eq').map(call => call.args)
  expect(filters).toContainEqual(['organization_id', 'org'])
  expect(filters).toContainEqual(['version', 3])
  const update = calls.find(call => call.name === 'update')!.args[0]
  expect(update).toMatchObject({ media_images: images, version: 4 })
  expect(update).not.toHaveProperty('content')
  expect(update).not.toHaveProperty('status')
})
it('rejects edits to already-approved media', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/images.put')
  results[0].data.status = 'approved'
  await expect(handler({ body: { version: 3, images } } as any)).rejects.toThrow(/brouillon/)
  expect(calls.some(call => call.name === 'update')).toBe(false)
})
it('rejects a stale media version without recording success', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/images.put')
  results[1].data = null
  await expect(handler({ body: { version: 3, images } } as any)).rejects.toThrow(/changé/)
  expect(logAudit).not.toHaveBeenCalled()
})
it('requires explicit media review and never schedules the approved images', async () => {
  const { default: handler } = await import('../server/api/admin/social-posts/[id]/review-media.post')
  await expect(handler({ body: { version: 3, content: 'Texte', confirmation: 'PUBLIER_MAINTENANT' } } as any)).rejects.toThrow(/explicite/)
  expect(calls).toEqual([])
  await handler({ body: { version: 3, content: 'Texte', confirmation: SOCIAL_MEDIA_REVIEW_CONFIRMATION } } as any)
  expect(calls.find(call => call.name === 'update')!.args[0]).toMatchObject({ status: 'approved', publish_after: null, content: 'Texte' })
  expect(calls.filter(call => call.name === 'eq').map(call => call.args)).toContainEqual(['version', 3])
})
