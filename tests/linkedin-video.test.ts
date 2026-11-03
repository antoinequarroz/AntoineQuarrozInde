import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isLinkedInVideoPost, validateSocialMediaItems } from '../server/utils/socialMedia'
import { validateAutomaticSocialPost, validateExpectedVersion, validateSocialApprovalMode, validateSocialContent, validateSocialDraftInput } from '../server/utils/socialPublication'

const storage = 'https://project.supabase.co'
const video = { type: 'video', url: `${storage}/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002.mp4`, alt: 'Prototype AventureTime AQ en 4:5' }
const image = { type: 'image', url: 'https://www.antoinequarroz.ch/social/a.jpg', alt: 'Capture du site' }
let results: any[], calls: { name: string, args: any[] }[]

beforeEach(() => {
  calls = []; results = []
  const db: any = new Proxy({}, { get: (_, name: string) => name === 'then' ? (resolve: any) => resolve(results.shift()) : (...args: any[]) => { calls.push({ name, args }); return db } })
  vi.stubGlobal('defineEventHandler', (handler: any) => handler)
  vi.stubGlobal('getSupabaseAdmin', () => db)
  vi.stubGlobal('requireAdmin', () => ({ user: { id: 'u' }, org: { id: 'org' } }))
  vi.stubGlobal('requireHermesPublishAccess', () => undefined)
  vi.stubGlobal('resolveHermesOrganization', () => ({ id: 'org' }))
  vi.stubGlobal('readJsonBodyLimited', (event: any) => event.body)
  vi.stubGlobal('getRouterParam', () => 'post')
  vi.stubGlobal('validateExpectedVersion', validateExpectedVersion)
  vi.stubGlobal('validateSocialApprovalMode', validateSocialApprovalMode)
  vi.stubGlobal('validateSocialContent', validateSocialContent)
  vi.stubGlobal('validateAutomaticSocialPost', validateAutomaticSocialPost)
  vi.stubGlobal('MAX_SOCIAL_REQUEST_BYTES', 16384)
  vi.stubGlobal('SOCIAL_PUBLISH_NOW_CONFIRMATION', 'PUBLIER_MAINTENANT')
  vi.stubGlobal('SOCIAL_SCHEDULE_CONFIRMATION', 'PROGRAMMER_POUR_18H')
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { supabaseUrl: storage } }))
  vi.stubGlobal('createError', (options: any) => Object.assign(new Error(options.message), options))
  vi.stubGlobal('logAudit', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

describe('one LinkedIn video for manual review', () => {
  it('accepts only an empty list or one immutable uploaded video', () => {
    expect(validateSocialMediaItems([], 'linkedin', storage)).toEqual([])
    expect(validateSocialMediaItems([video], 'linkedin', storage)).toEqual([video])
    expect(isLinkedInVideoPost({ platform: 'linkedin', media_items: [video] })).toBe(true)
    expect(isLinkedInVideoPost({ platform: 'instagram', media_items: [video] })).toBe(false)
    for (const value of [[image], [video, image], [video, { ...video, url: video.url.replace('0002.mp4', '0003.mp4') }], [{ ...video, alt: '' }],
      [{ ...video, url: 'https://evil.example/a.mp4' }], [{ ...video, url: `${video.url}?token=secret` }], [{ ...video, url: `${video.url}#fragment` }]]) {
      expect(() => validateSocialMediaItems(value, 'linkedin', storage)).toThrow()
    }
    expect(() => validateSocialMediaItems([video], 'x', storage)).toThrow()
  })
  it('keeps media types exclusive when Hermes prepares drafts', () => {
    const body = { platform: 'linkedin', sourceKey: 'aventuretime-linkedin', articleTitle: 'AventureTime prototype', articleUrl: 'https://www.antoinequarroz.ch/', content: 'Trois îles', mediaItems: [video] }
    expect(validateSocialDraftInput(body).mediaItems).toEqual([video])
    expect(() => validateSocialDraftInput({ ...body, mediaImages: [{ url: image.url, alt: image.alt }] })).toThrow(/mélanger/)
    expect(() => validateSocialDraftInput({ ...body, mediaKind: 'document', mediaUrl: 'https://www.antoinequarroz.ch/social/a.pdf', mediaTitle: 'PDF' })).toThrow(/mélanger/)
  })
  it.each(['draft', 'failed'])('saves a %s video using tenant/version guards and revokes all publishing authority', async status => {
    results = [{ data: { platform: 'linkedin', status, media_kind: null } }, { data: { id: 'post', version: 4, status: 'draft' } }]
    const { default: handler } = await import('../server/api/admin/social-posts/[id]/media.put')
    await handler({ body: { version: 3, media: [video], content: 'Do not overwrite', planned_at: null, status: 'approved', organization_id: 'foreign' } } as any)
    const update = calls.find(call => call.name === 'update')!.args[0]
    expect(update).toMatchObject({ media_items: [video], media_images: [], status: 'draft', last_error: null, publication_mode: 'manual', publish_after: null, approved_version: null, approval_fingerprint: null, version: 4 })
    for (const field of ['content', 'planned_at', 'organization_id']) expect(update).not.toHaveProperty(field)
    expect(calls.filter(call => call.name === 'eq').map(call => call.args)).toEqual(expect.arrayContaining([['organization_id', 'org'], ['version', 3], ['id', 'post']]))
    expect(calls.some(call => call.name === 'rpc')).toBe(false)
  })
  it('can remove a video without replacing the caption or calendar date', async () => {
    results = [{ data: { platform: 'linkedin', status: 'draft', media_kind: null } }, { data: { id: 'post', version: 5 } }]
    const { default: handler } = await import('../server/api/admin/social-posts/[id]/media.put')
    await handler({ body: { version: 4, media: [] } } as any)
    expect(calls.find(call => call.name === 'update')!.args[0]).toMatchObject({ media_items: [], media_images: [], publication_mode: 'manual', approved_version: null, approval_fingerprint: null })
  })
  it.each(['approved', 'published', 'publishing', 'rejected'])('cannot attach a video to a protected %s post', async status => {
    results = [{ data: { platform: 'linkedin', status, media_kind: null } }]
    const { default: handler } = await import('../server/api/admin/social-posts/[id]/media.put')
    await expect(handler({ body: { version: 3, media: [video] } } as any)).rejects.toThrow(/brouillon/)
    expect(calls.some(call => call.name === 'update')).toBe(false)
  })
  it('rejects a PDF, a stale version and unauthenticated writes without success auditing', async () => {
    const { default: handler } = await import('../server/api/admin/social-posts/[id]/media.put')
    results = [{ data: { platform: 'linkedin', status: 'draft', media_kind: 'document' } }]
    await expect(handler({ body: { version: 3, media: [video] } } as any)).rejects.toThrow(/sans PDF/)
    expect(calls.some(call => call.name === 'update')).toBe(false)
    results = [{ data: { platform: 'linkedin', status: 'draft', media_kind: null } }, { data: null }]
    await expect(handler({ body: { version: 3, media: [video] } } as any)).rejects.toThrow(/changé/)
    expect(logAudit).not.toHaveBeenCalled()
    vi.stubGlobal('requireAdmin', () => { throw new Error('unauthorized') })
    await expect(handler({ body: {} } as any)).rejects.toThrow('unauthorized')
  })
})

describe('LinkedIn video cannot enter the automatic publisher', () => {
  it('rejects both immediate and scheduled approval before any RPC', async () => {
    expect(() => validateAutomaticSocialPost({ platform: 'linkedin', media_items: [video] })).toThrow(/manuelle/)
    const { default: handler } = await import('../server/api/admin/social-posts/[id]/approve.post')
    for (const [mode, confirmation] of [['now', 'PUBLIER_MAINTENANT'], ['scheduled', 'PROGRAMMER_POUR_18H']]) {
      results = [{ data: { platform: 'linkedin', status: 'draft', media_items: [video], media_images: [] } }]
      await expect(handler({ body: { version: 3, mode, confirmation, content: 'Prototype' } } as any)).rejects.toThrow(/manuelle/)
    }
    expect(calls.some(call => call.name === 'rpc')).toBe(false)
    expect(logAudit).not.toHaveBeenCalled()
  })
  it('excludes videos from the queue before limiting even for a Reel-capable publisher', async () => {
    results = [{ data: [{ id: 'linkedin-video', platform: 'linkedin', media_items: [video] }, { id: 'instagram-reel', platform: 'instagram', media_items: [video] }, { id: 'linkedin-text', platform: 'linkedin', media_items: [] }] }]
    const { default: handler } = await import('../server/api/hermes/social-publications.get')
    const response = await handler({ node: { req: { headers: { 'x-hermes-social-capabilities': 'instagram-mixed-v1,instagram-reels-v1' } } } } as any)
    expect(response.posts.map((post: any) => post.id)).toEqual(['instagram-reel', 'linkedin-text'])
    expect(calls.find(call => call.name === 'or')?.args).toEqual(['media_items.eq.[],platform.eq.instagram'])
    expect(calls.findIndex(call => call.name === 'or')).toBeLessThan(calls.findIndex(call => call.name === 'limit'))
  })
  it.each(['', 'instagram-mixed-v1', 'instagram-mixed-v1,instagram-reels-v1'])('refuses claiming a LinkedIn video with capabilities %j before the claim RPC', async capabilities => {
    results = [{ data: { platform: 'linkedin', media_items: [video] } }]
    const { default: handler } = await import('../server/api/hermes/social-publications.post')
    await expect(handler({ node: { req: { headers: { 'x-hermes-social-capabilities': capabilities } } }, body: { action: 'claim', id: 'post', version: 3 } } as any)).rejects.toThrow(/manuelle/)
    expect(calls.some(call => call.name === 'rpc')).toBe(false)
  })
})
