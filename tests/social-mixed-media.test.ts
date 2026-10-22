import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateSocialMediaItems } from '../server/utils/socialMedia'
import { validateAutomaticSocialPost, validateExpectedVersion } from '../server/utils/socialPublication'
import { isStrictSocialVideoBucket, MAX_SOCIAL_VIDEO_BYTES, validateSocialVideoDataUrl, validateSocialVideoProbe } from '../server/utils/socialVideoUpload'

const storage = 'https://project.supabase.co'
const image = { type: 'image', url: 'https://www.antoinequarroz.ch/social/01.jpg', alt: 'Accueil du cabinet' }
const video = { type: 'video', url: `${storage}/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002.mp4`, alt: 'Démonstration mobile' }
const media = [image, video]
beforeEach(() => {
  vi.stubGlobal('createError', (options: any) => Object.assign(new Error(options.message), options))
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { supabaseUrl: storage } }))
})
afterEach(() => vi.unstubAllGlobals())

describe('ordered Instagram media', () => {
  it('preserves image/video types and order, and leaves legacy empty lists valid', () => {
    expect(validateSocialMediaItems(media, 'instagram', storage)).toEqual(media)
    expect(validateSocialMediaItems([], 'linkedin', storage)).toEqual([])
    expect(validateAutomaticSocialPost({ platform: 'instagram', media_images: [], media_items: media })).toBe('instagram')
  })
  it('accepts one standalone video with the same immutable storage and description rules', () => {
    expect(validateSocialMediaItems([video], 'instagram', storage)).toEqual([video])
    expect(validateAutomaticSocialPost({ platform: 'instagram', media_images: [], media_items: [video] })).toBe('instagram')
    for (const item of [{ ...video, alt: '' }, { ...video, url: 'https://evil.example/reel.mp4' }, { ...video, url: `${video.url}?token=private` }]) {
      expect(() => validateSocialMediaItems([item], 'instagram', storage)).toThrow()
    }
    expect(() => validateSocialMediaItems([video], 'x', storage)).toThrow()
    expect(validateSocialMediaItems([video], 'linkedin', storage)).toEqual([video])
    expect(() => validateAutomaticSocialPost({ platform: 'instagram', media_items: [video], media_images: [{ url: image.url, alt: image.alt }] })).toThrow(/incompatibles/)
  })
  it('rejects other platforms, partial carousels, duplicates, type spoofing and foreign URLs', () => {
    for (const [items, platform] of [[media, 'linkedin'], [[image], 'instagram'], [[image, image], 'instagram'], [[image, { ...video, type: 'image' }], 'instagram'], [[image, { ...video, url: 'https://evil.example/a.mp4' }], 'instagram'], [[image, { ...video, url: video.url + '?token=a' }], 'instagram']] as const) {
      expect(() => validateSocialMediaItems(items, platform, storage)).toThrow()
    }
    expect(() => validateAutomaticSocialPost({ platform: 'instagram', media_items: media, media_images: [{ url: image.url, alt: image.alt }] })).toThrow(/incompatibles/)
  })
})

const validProbe = () => ({ format: { format_name: 'mov,mp4,m4a,3gp,3g2,mj2', duration: '7.000000' }, streams: [{ codec_type: 'video', codec_name: 'h264', width: 1080, height: 1350, pix_fmt: 'yuv420p', avg_frame_rate: '30/1' }] })
describe('bounded MP4 validation', () => {
  it('accepts a silent H264 portrait clip and optional AAC audio', () => {
    expect(validateSocialVideoProbe(validProbe())).toMatchObject({ width: 1080, height: 1350, duration: 7, fps: 30 })
    const withAudio = validProbe()
    withAudio.streams.push({ codec_type: 'audio', codec_name: 'aac', channels: 2, sample_rate: '48000' } as any)
    expect(validateSocialVideoProbe(withAudio).duration).toBe(7)
  })
  it('accepts a vertical 9:16 Reel without relaxing codec, duration or dimension bounds', () => {
    const portrait = validProbe()
    Object.assign(portrait.streams[0]!, { width: 1080, height: 1920 })
    expect(validateSocialVideoProbe(portrait)).toMatchObject({ width: 1080, height: 1920, duration: 7 })
    for (const width of [1078, 320]) {
      portrait.streams[0]!.width = width
      expect(() => validateSocialVideoProbe(portrait)).toThrow()
    }
  })
  it('rejects HEVC, wrong chroma, extra tracks, invalid duration, frame rate and dimensions', () => {
    for (const change of [{ codec_name: 'hevc' }, { pix_fmt: 'yuv444p' }, { width: 4000 }, { width: 300 }, { avg_frame_rate: '0/0' }, { avg_frame_rate: '120/1' }, { side_data_list: [{ rotation: 90 }] }, { tags: { rotate: '90' } }]) {
      const probe = validProbe(); Object.assign(probe.streams[0]!, change)
      expect(() => validateSocialVideoProbe(probe)).toThrow()
    }
    const short = validProbe(); short.format.duration = '2.99'
    expect(() => validateSocialVideoProbe(short)).toThrow()
    const extra = validProbe(); extra.streams.push({ codec_type: 'subtitle' } as any)
    expect(() => validateSocialVideoProbe(extra)).toThrow()
    for (const audio of [{ channels: 3, sample_rate: '48000' }, { channels: 2, sample_rate: '96000' }]) {
      const probe = validProbe(); probe.streams.push({ codec_type: 'audio', codec_name: 'aac', ...audio } as any)
      expect(() => validateSocialVideoProbe(probe)).toThrow()
    }
  })
  it('rejects spoofed MP4 headers and oversized bytes before launching a probe', async () => {
    await expect(validateSocialVideoDataUrl('data:video/mp4;base64,' + Buffer.from('not a video at all').toString('base64'))).rejects.toThrow(/signature/)
    await expect(validateSocialVideoDataUrl('data:video/webm;base64,AAAA')).rejects.toThrow(/MP4/)
    await expect(validateSocialVideoDataUrl('data:video/mp4;base64,' + 'A'.repeat(Math.ceil(MAX_SOCIAL_VIDEO_BYTES / 3) * 4 + 4))).rejects.toMatchObject({ statusCode: 413 })
  })
  it('requires a dedicated public MP4-only bounded storage bucket', () => {
    expect(isStrictSocialVideoBucket({ public: true, file_size_limit: MAX_SOCIAL_VIDEO_BYTES, allowed_mime_types: ['video/mp4'] })).toBe(true)
    expect(isStrictSocialVideoBucket({ public: true, file_size_limit: MAX_SOCIAL_VIDEO_BYTES + 1, allowed_mime_types: ['video/mp4'] })).toBe(false)
    expect(isStrictSocialVideoBucket({ public: true, file_size_limit: 1024, allowed_mime_types: ['video/mp4', 'text/html'] })).toBe(false)
  })
})

describe('saved media and explicit publication boundary', () => {
  let results: any[], calls: { name: string, args: any[] }[]
  beforeEach(() => {
    calls = []; results = [{ data: { platform: 'instagram', status: 'draft', media_kind: null } }, { data: { id: 'post', version: 4 } }]
    const db: any = new Proxy({}, { get: (_, name: string) => name === 'then' ? (resolve: any) => resolve(results.shift()) : (...args: any[]) => { calls.push({ name, args }); return db } })
    vi.stubGlobal('defineEventHandler', (handler: any) => handler)
    vi.stubGlobal('getSupabaseAdmin', () => db)
    vi.stubGlobal('requireAdmin', () => ({ user: { id: 'u' }, org: { id: 'org' } }))
    vi.stubGlobal('requireHermesPublishAccess', () => undefined)
    vi.stubGlobal('resolveHermesOrganization', () => ({ id: 'org' }))
    vi.stubGlobal('readJsonBodyLimited', (event: any) => event.body)
    vi.stubGlobal('getRouterParam', () => 'post')
    vi.stubGlobal('validateExpectedVersion', validateExpectedVersion)
    vi.stubGlobal('MAX_SOCIAL_REQUEST_BYTES', 16384)
    vi.stubGlobal('logAudit', vi.fn())
  })
  it('saves only ordered attachments and revokes every publication permission without editing caption or status', async () => {
    const { default: handler } = await import('../server/api/admin/social-posts/[id]/media.put')
    await handler({ body: { version: 3, media, content: 'unwanted', status: 'approved', organization_id: 'other' } } as any)
    const update = calls.find(call => call.name === 'update')!.args[0]
    expect(update).toMatchObject({ media_items: media, media_images: [], publication_mode: 'manual', approved_version: null, approval_fingerprint: null, publish_after: null, version: 4 })
    expect(update).not.toHaveProperty('content'); expect(update).not.toHaveProperty('status')
    expect(calls.filter(c => c.name === 'eq').map(c => c.args)).toContainEqual(['organization_id', 'org'])
    expect(calls.filter(c => c.name === 'eq').map(c => c.args)).toContainEqual(['version', 3])
  })
  it('saves a standalone video without changing the desired date, caption or draft status', async () => {
    const { default: handler } = await import('../server/api/admin/social-posts/[id]/media.put')
    await handler({ body: { version: 3, media: [video], content: 'unwanted', planned_at: null, status: 'approved' } } as any)
    const update = calls.find(call => call.name === 'update')!.args[0]
    expect(update).toMatchObject({ media_items: [video], media_images: [], publication_mode: 'manual', approved_version: null, approval_fingerprint: null, publish_after: null, version: 4 })
    for (const field of ['content', 'status', 'planned_at']) expect(update).not.toHaveProperty(field)
    expect(calls.some(call => call.name === 'rpc')).toBe(false)
  })
  it('rejects authentication, approved drafts and stale versions without a success audit', async () => {
    const { default: handler } = await import('../server/api/admin/social-posts/[id]/media.put')
    results[0].data.status = 'approved'
    await expect(handler({ body: { version: 3, media } } as any)).rejects.toThrow(/brouillon/)
    expect(calls.some(c => c.name === 'update')).toBe(false)
    results = [{ data: { platform: 'instagram', status: 'draft' } }, { data: null }]
    await expect(handler({ body: { version: 3, media } } as any)).rejects.toThrow(/changé/)
    expect(logAudit).not.toHaveBeenCalled()
    vi.stubGlobal('requireAdmin', () => { throw new Error('unauthorized') })
    await expect(handler({ body: {} } as any)).rejects.toThrow('unauthorized')
  })
  it('does not return mixed posts to older publishers', async () => {
    const { default: handler } = await import('../server/api/hermes/social-publications.get')
    results = [{ data: [] }]
    await handler({ node: { req: { headers: {} } } } as any)
    expect(calls.filter(c => c.name === 'eq').map(c => c.args)).toContainEqual(['media_items', '[]'])
  })
  it('only returns mixed posts to an explicit capable publisher', async () => {
    const { default: handler } = await import('../server/api/hermes/social-publications.get')
    results = [{ data: [] }]
    await handler({ node: { req: { headers: { 'x-hermes-social-capabilities': 'instagram-mixed-v1' } } } } as any)
    expect(calls.filter(c => c.name === 'eq').map(c => c.args)).not.toContainEqual(['media_items', '[]'])
  })
  it('does not expose a Reel to a runner that only supports mixed carousels', async () => {
    const { default: handler } = await import('../server/api/hermes/social-publications.get')
    results = [{ data: [{ id: 'reel', media_items: [video] }, { id: 'carousel', media_items: media }, { id: 'image', media_items: [] }] }]
    const response = await handler({ node: { req: { headers: { 'x-hermes-social-capabilities': 'instagram-mixed-v1' } } } } as any)
    expect(response.posts.map((post: any) => post.id)).toEqual(['carousel', 'image'])
    expect(calls.find(c => c.name === 'or')?.args).toEqual(['media_items.eq.[],and(platform.eq.instagram,media_items->1.not.is.null)'])
    expect(calls.findIndex(c => c.name === 'or')).toBeLessThan(calls.findIndex(c => c.name === 'limit'))
  })
  it('returns a Reel to a runner explicitly supporting both media and Reels', async () => {
    const { default: handler } = await import('../server/api/hermes/social-publications.get')
    results = [{ data: [{ id: 'reel', media_items: [video] }] }]
    const response = await handler({ node: { req: { headers: { 'x-hermes-social-capabilities': 'instagram-mixed-v1, instagram-reels-v1' } } } } as any)
    expect(response.posts).toEqual([{ id: 'reel', media_items: [video] }])
    expect(calls.find(c => c.name === 'or')?.args).toEqual(['media_items.eq.[],platform.eq.instagram'])
  })
  it('rejects an old publisher claiming a known mixed post before the claim RPC', async () => {
    const { default: handler } = await import('../server/api/hermes/social-publications.post')
    results = [{ data: { media_items: media } }]
    await expect(handler({ node: { req: { headers: {} } }, body: { action: 'claim', id: 'post', version: 3 } } as any)).rejects.toThrow(/compatible/)
    expect(calls.some(c => c.name === 'rpc')).toBe(false)
  })
  it('rejects a carousel-only runner claiming a Reel before the claim RPC', async () => {
    const { default: handler } = await import('../server/api/hermes/social-publications.post')
    results = [{ data: { media_items: [video] } }]
    await expect(handler({ node: { req: { headers: { 'x-hermes-social-capabilities': 'instagram-mixed-v1' } } }, body: { action: 'claim', id: 'post', version: 3 } } as any)).rejects.toThrow(/instagram-reels-v1/)
    expect(calls.some(c => c.name === 'rpc')).toBe(false)
  })
  it('lets a Reel-capable runner use the existing atomic claim and preserves carousel compatibility', async () => {
    const { default: handler } = await import('../server/api/hermes/social-publications.post')
    results = [{ data: { platform: 'instagram', media_items: [video] } }, { data: [{ id: 'reel', media_items: [video] }] }]
    const result = await handler({ node: { req: { headers: { 'x-hermes-social-capabilities': 'instagram-mixed-v1,instagram-reels-v1' } } }, body: { action: 'claim', id: 'reel', version: 3 } } as any)
    expect(result).toEqual({ post: { id: 'reel', media_items: [video] } })
    expect(calls.find(c => c.name === 'rpc')?.args).toEqual(['claim_social_post', { p_organization_id: 'org', p_post_id: 'reel', p_expected_version: 3 }])
    calls = []; results = [{ data: { media_items: media } }, { data: [{ id: 'carousel' }] }]
    await handler({ node: { req: { headers: { 'x-hermes-social-capabilities': 'instagram-mixed-v1' } } }, body: { action: 'claim', id: 'carousel', version: 3 } } as any)
    expect(calls.some(c => c.name === 'rpc')).toBe(true)
  })
})
