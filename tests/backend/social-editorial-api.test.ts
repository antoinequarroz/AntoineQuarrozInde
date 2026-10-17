import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseSocialPostListQuery, socialPostSearchFilter, validateSocialPlannedAt, validateSocialPublishAfter } from '../../server/utils/socialEditorial'
import { nextSocialPublicationAt, validateAutomaticSocialPost, validateExpectedVersion, validateSocialApprovalMode, validateSocialContent } from '../../server/utils/socialPublication'

let results: any[]
let calls: { name: string, args: any[] }[]
const now = new Date('2026-10-17T08:00:00.000Z')
const content = 'Présentation https://www.antoinequarroz.ch/'

beforeEach(() => {
  calls = []
  results = []
  vi.useFakeTimers()
  vi.setSystemTime(now)
  const db: any = new Proxy({}, { get: (_, name: string) => name === 'then'
    ? (resolve: any) => resolve(results.shift())
    : (...args: any[]) => { calls.push({ name, args }); return db } })
  vi.stubGlobal('defineEventHandler', (handler: any) => handler)
  vi.stubGlobal('getSupabaseAdmin', () => db)
  vi.stubGlobal('requireAdmin', () => ({ user: { id: 'user' }, org: { id: 'allowed-org' } }))
  vi.stubGlobal('getQuery', (event: any) => event.query || {})
  vi.stubGlobal('readJsonBodyLimited', (event: any) => event.body)
  vi.stubGlobal('getRouterParam', () => 'post-id')
  vi.stubGlobal('createError', (options: any) => Object.assign(new Error(options.message), options))
  vi.stubGlobal('setHeader', vi.fn())
  vi.stubGlobal('validateExpectedVersion', validateExpectedVersion)
  vi.stubGlobal('validateSocialApprovalMode', validateSocialApprovalMode)
  vi.stubGlobal('validateAutomaticSocialPost', validateAutomaticSocialPost)
  vi.stubGlobal('validateSocialContent', validateSocialContent)
  vi.stubGlobal('nextSocialPublicationAt', nextSocialPublicationAt)
  vi.stubGlobal('SOCIAL_PUBLISH_NOW_CONFIRMATION', 'PUBLIER_MAINTENANT')
  vi.stubGlobal('SOCIAL_SCHEDULE_CONFIRMATION', 'PROGRAMMER_POUR_18H')
  vi.stubGlobal('MAX_SOCIAL_REQUEST_BYTES', 16384)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { supabaseUrl: '' } }))
  vi.stubGlobal('studioInstagramContentId', (key: string) => key === 'studio:example' ? 'studio-id' : null)
  vi.stubGlobal('logAudit', vi.fn())
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('explicit social dates', () => {
  it('normalizes explicit offsets while preserving the exact instant and allows clearing editorial intent', () => {
    expect(validateSocialPlannedAt(null)).toBeNull()
    expect(validateSocialPlannedAt('2026-10-25T02:30:00+02:00')).toBe('2026-10-25T00:30:00.000Z')
    expect(validateSocialPlannedAt('2026-10-25T02:30:00+01:00')).toBe('2026-10-25T01:30:00.000Z')
    expect(validateSocialPlannedAt('2024-02-29T18:00Z')).toBe('2024-02-29T18:00:00.000Z')
    expect(validateSocialPublishAfter('2026-12-01T18:15:30.250+01:00')).toBe('2026-12-01T17:15:30.250Z')
  })

  it.each([undefined, '', '2026-10-25T02:30', '2026-03-29T02:30', '2026-02-29T18:00Z', '2026-04-31T18:00Z',
    '2026-00-17T18:00Z', '2026-10-17T24:00Z', '2026-10-17T18:60Z', '2026-10-17T18:00:60Z',
    '2026-10-17T18:00:00+24:00', '2026-10-17T18:00:00+01:60', '2026-10-17T18:00:00Z extra', '2026-10-17T18:00:00Z\n',
    '0000-01-01T18:00Z', '9999-12-31T23:30:00-02:00', ['2026-10-17T18:00Z']])('rejects missing, local, impossible or malformed date %j', value => {
    expect(() => validateSocialPlannedAt(value)).toThrow(/invalide/)
  })

  it('rejects a publication at or before now but permits past editorial dates', () => {
    expect(validateSocialPlannedAt('2026-01-01T18:00:00Z')).toBe('2026-01-01T18:00:00.000Z')
    expect(() => validateSocialPublishAfter(now.toISOString())).toThrow(/futur/)
    expect(() => validateSocialPublishAfter('2026-10-17T09:00:00+02:00')).toThrow(/futur/)
    expect(validateSocialPublishAfter('2026-10-17T08:00:00.001Z')).toBe('2026-10-17T08:00:00.001Z')
  })
})

describe('complete paginated history', () => {
  it('parses a bounded page, platform and known status groups', () => {
    expect(parseSocialPostListQuery({ page: '3', pageSize: '40', platform: 'instagram', status: 'review', search: ' Physio ' }))
      .toMatchObject({ page: 3, pageSize: 40, offset: 80, platform: 'instagram', statuses: ['draft', 'failed'], search: 'Physio' })
    expect(parseSocialPostListQuery({})).toMatchObject({ page: 1, pageSize: 100, statuses: null })
    expect(parseSocialPostListQuery({ status: 'rejected' }).statuses).toEqual(['rejected'])
    expect(parseSocialPostListQuery({ status: 'waiting' }).statuses).toEqual(['approved', 'publishing'])
  })

  it.each([{ page: '0' }, { page: ['1'] }, { pageSize: '101' }, { page: '1.5' }, { page: '1\n' }, { page: '1\r' },
    { pageSize: '100\n' }, { pageSize: '100\u2028' }, { platform: 'other' },
    { status: 'constructor' }, { status: '__proto__' }, { status: ['draft'] }, { search: ['x'] }, { search: 'x'.repeat(161) }])('rejects invalid list query %j', query => {
    expect(() => parseSocialPostListQuery(query)).toThrow(/invalide/)
  })

  it('quotes adversarial search values instead of letting them introduce another PostgREST predicate', () => {
    expect(socialPostSearchFilter('test')).toBe('article_title.ilike."%test%",content.ilike."%test%"')
    const filter = socialPostSearchFilter('a%,status.eq.approved),"')
    expect(filter).toContain('\\\\%')
    expect(filter).toContain('\\"')
    expect(filter).toMatch(/^article_title\.ilike\."[\s\S]*",content\.ilike\."[\s\S]*"$/)
  })

  it('returns page 2 beyond the former 100-row cap, includes rejected history and preserves connection compatibility', async () => {
    const post = { id: 'post-id', status: 'rejected', source_key: 'studio:example', planned_at: null }
    results = [{ data: [post], count: 101 }, { data: [{ platform: 'instagram', state: 'ready' }] }]
    const { default: handler } = await import('../../server/api/admin/social-posts.get')
    const result = await handler({ query: { page: '2', pageSize: '100', status: 'all' } } as any)
    expect(result.posts).toEqual([{ id: 'post-id', status: 'rejected', planned_at: null, studioContentId: 'studio-id' }])
    expect(result.connections).toEqual([{ platform: 'instagram', state: 'ready' }])
    expect(result.pagination).toEqual({ page: 2, pageSize: 100, total: 101, totalPages: 2, hasMore: false })
    expect(calls.find(call => call.name === 'range')?.args).toEqual([100, 199])
    expect(calls.filter(call => call.name === 'order').map(call => call.args)).toEqual([
      ['created_at', { ascending: false }], ['id', { ascending: false }],
    ])
    expect(calls.filter(call => call.name === 'eq').map(call => call.args)).toEqual([['organization_id', 'allowed-org'], ['organization_id', 'allowed-org']])
    expect(calls.find(call => call.name === 'select')?.args[1]).toEqual({ count: 'exact' })
    expect(calls.some(call => call.name === 'neq' || call.name === 'limit')).toBe(false)
  })

  it('applies platform and status before pagination and refuses unauthenticated reads', async () => {
    results = [{ data: [], count: 0 }, { data: [] }]
    const { default: handler } = await import('../../server/api/admin/social-posts.get')
    await handler({ query: { status: 'rejected', platform: 'x' } } as any)
    expect(calls.filter(call => call.name === 'eq').map(call => call.args)).toContainEqual(['platform', 'x'])
    expect(calls.find(call => call.name === 'in')?.args).toEqual(['status', ['rejected']])
    calls = []
    vi.stubGlobal('requireAdmin', () => { throw new Error('unauthorized') })
    await expect(handler({} as any)).rejects.toThrow('unauthorized')
    expect(calls).toEqual([])
  })
})

describe('editorial intent has no publishing authority', () => {
  it.each(['draft', 'failed'])('plans a %s post using tenant/version/status CAS without changing content or consent', async status => {
    results = [{ data: { platform: 'linkedin', status } }, { data: { id: 'post-id', planned_at: '2026-10-22T16:00:00.000Z', version: 4 } }]
    const { default: handler } = await import('../../server/api/admin/social-posts/[id].put')
    await handler({ body: { action: 'plan', version: 3, planned_at: '2026-10-22T18:00:00+02:00', content: 'Unseen text',
      status: 'approved', publish_after: '2026-10-22T16:00:00Z', organization_id: 'foreign' } } as any)
    expect(calls.find(call => call.name === 'update')?.args[0]).toEqual({ planned_at: '2026-10-22T16:00:00.000Z', version: 4, updated_at: now.toISOString() })
    expect(calls.filter(call => call.name === 'eq').map(call => call.args)).toEqual(expect.arrayContaining([
      ['organization_id', 'allowed-org'], ['id', 'post-id'], ['version', 3],
    ]))
    expect(calls.find(call => call.name === 'in')?.args).toEqual(['status', ['draft', 'failed']])
    expect(calls.some(call => call.name === 'rpc')).toBe(false)
  })

  it.each(['approved', 'publishing', 'published', 'rejected'])('refuses planning the protected state %s', async status => {
    results = [{ data: { platform: 'x', status } }]
    const { default: handler } = await import('../../server/api/admin/social-posts/[id].put')
    await expect(handler({ body: { action: 'plan', planned_at: null, version: 1 } } as any)).rejects.toThrow()
    expect(calls.some(call => call.name === 'update')).toBe(false)
  })

  it('can clear intent, but never reports a stale version as a successful plan', async () => {
    results = [{ data: { platform: 'x', status: 'draft' } }, { data: null }]
    const { default: handler } = await import('../../server/api/admin/social-posts/[id].put')
    await expect(handler({ body: { action: 'plan', planned_at: null, version: 1 } } as any)).rejects.toThrow(/changé/)
    expect(calls.find(call => call.name === 'update')?.args[0]).toMatchObject({ planned_at: null })
    expect(logAudit).not.toHaveBeenCalled()
  })
})

describe('custom publication consent', () => {
  const body = { mode: 'scheduled', version: 3, content, publish_after: '2026-10-22T18:00:00+02:00', confirmation: 'PROGRAMMER_DATE_PERSONNALISEE' }
  const current = { platform: 'linkedin', status: 'draft', publication_mode: 'manual', article_url: 'https://www.antoinequarroz.ch/', media_images: [] }

  it('rejects a custom schedule using the old 18:00 confirmation before database access', async () => {
    const { default: handler } = await import('../../server/api/admin/social-posts/[id]/approve.post')
    await expect(handler({ body: { ...body, confirmation: 'PROGRAMMER_POUR_18H' } } as any)).rejects.toThrow(/explicite/)
    expect(calls).toEqual([])
  })

  it('passes the normalized future instant to the existing atomic approval RPC', async () => {
    results = [{ data: current }, { data: [{ id: 'post-id', status: 'approved' }] }]
    const { default: handler } = await import('../../server/api/admin/social-posts/[id]/approve.post')
    await handler({ body } as any)
    expect(calls.find(call => call.name === 'rpc')?.args).toEqual(['approve_social_post', {
      p_organization_id: 'allowed-org', p_post_id: 'post-id', p_expected_version: 3, p_content: content, p_publish_after: '2026-10-22T16:00:00.000Z',
    }])
  })

  it.each(['2026-10-17T07:59:59Z', '2026-02-30T18:00:00Z', '2026-10-22T18:00', null])('refuses invalid or past custom publication %j without approving', async publish_after => {
    results = [{ data: current }]
    const { default: handler } = await import('../../server/api/admin/social-posts/[id]/approve.post')
    await expect(handler({ body: { ...body, publish_after } } as any)).rejects.toThrow()
    expect(calls.some(call => call.name === 'rpc')).toBe(false)
  })

  it('keeps legacy scheduled and immediate approvals compatible', async () => {
    const { default: handler } = await import('../../server/api/admin/social-posts/[id]/approve.post')
    for (const [mode, confirmation, expected] of [
      ['scheduled', 'PROGRAMMER_POUR_18H', '2026-10-17T16:00:00.000Z'],
      ['now', 'PUBLIER_MAINTENANT', now.toISOString()],
    ]) {
      results = [{ data: current }, { data: [{ id: 'post-id', status: 'approved' }] }]
      calls = []
      await handler({ body: { mode, confirmation, version: 3, content } } as any)
      expect(calls.find(call => call.name === 'rpc')?.args[1].p_publish_after).toBe(expected)
    }
  })
})
