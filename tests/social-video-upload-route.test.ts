import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ validate: vi.fn() }))
vi.mock('../server/utils/socialVideoUpload', async (original) => ({ ...await original<typeof import('../server/utils/socialVideoUpload')>(), validateSocialVideoDataUrl: mocks.validate }))
let bucket: Record<string, unknown>, uploads: { bucket: string, path: string, options: unknown }[]
let storageReads: number
beforeEach(() => {
  uploads = []; storageReads = 0
  bucket = { public: true, file_size_limit: 20 * 1024 * 1024, allowed_mime_types: ['video/mp4'] }
  mocks.validate.mockReset().mockResolvedValue({ buffer: Buffer.from('already probed'), mime: 'video/mp4', width: 1080, height: 1350, duration: 7 })
  vi.stubGlobal('defineEventHandler', (handler: any) => handler)
  vi.stubGlobal('requireAdmin', () => ({ org: { id: '00000000-0000-0000-0000-000000000001' } }))
  vi.stubGlobal('readJsonBodyLimited', (event: any) => event.body)
  vi.stubGlobal('createError', (options: any) => Object.assign(new Error(options.message), options))
  vi.stubGlobal('getSupabaseAdmin', () => ({ storage: {
    getBucket: async () => { storageReads++; return { data: bucket } },
    from: (name: string) => ({
      upload: async (path: string, _bytes: Buffer, options: unknown) => { uploads.push({ bucket: name, path, options }); return { error: null } },
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://project.supabase.co/storage/v1/object/public/${name}/${path}` } }),
    }),
  } }))
})
afterEach(() => vi.unstubAllGlobals())

it('authenticates before accepting any upload bytes or reaching storage', async () => {
  const { default: handler } = await import('../server/api/admin/social-video-upload.post')
  vi.stubGlobal('requireAdmin', () => { throw new Error('unauthorized') })
  await expect(handler({ body: { dataUrl: 'private' } } as any)).rejects.toThrow('unauthorized')
  expect(mocks.validate).not.toHaveBeenCalled(); expect(storageReads).toBe(0)
})
it('rejects unsafe buckets without uploading and leaves the image bucket untouched', async () => {
  const { default: handler } = await import('../server/api/admin/social-video-upload.post')
  bucket.allowed_mime_types = ['video/mp4', 'text/html']
  await expect(handler({ body: { dataUrl: 'data:video/mp4;base64,AA==' } } as any)).rejects.toThrow(/sécurisé/)
  expect(uploads).toEqual([])
})
it('uses an immutable tenant-scoped random path only after byte/probe validation', async () => {
  const { default: handler } = await import('../server/api/admin/social-video-upload.post')
  const result = await handler({ body: { dataUrl: 'video', filename: '../../other.mp4', organization_id: 'other' } } as any)
  expect(mocks.validate).toHaveBeenCalledWith('video')
  expect(uploads).toHaveLength(1)
  expect(uploads[0]).toMatchObject({ bucket: 'social-videos', options: { contentType: 'video/mp4', upsert: false } })
  expect(uploads[0]!.path).toMatch(/^uploads\/00000000-0000-0000-0000-000000000001\/[0-9a-f-]{36}\.mp4$/)
  expect(result).toMatchObject({ width: 1080, height: 1350, duration: 7 })
  expect(result.url).toContain('/social-videos/uploads/')
})
