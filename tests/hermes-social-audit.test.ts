import { afterEach, describe, expect, it, vi } from 'vitest'

async function run(rows: any[] = [], query = {}, options: { unauthorized?: boolean; error?: boolean } = {}) {
  const request: any = {}
  for (const key of ['select', 'eq', 'order', 'limit', 'gt']) request[key] = vi.fn(() => request)
  request.then = (resolve: any) => Promise.resolve({ data: rows, error: options.error ? { message: 'private DB details' } : null }).then(resolve)
  const from = vi.fn(() => request)
  const auth = vi.fn(() => { if (options.unauthorized) throw new Error('unauthorized') })
  vi.stubGlobal('defineEventHandler', (handler: any) => handler)
  vi.stubGlobal('requireHermesReadAccess', auth)
  vi.stubGlobal('getQuery', () => query)
  vi.stubGlobal('createError', (value: any) => Object.assign(new Error(value.message), value))
  vi.stubGlobal('resolveHermesOrganization', async () => ({ id: 'org1' }))
  vi.stubGlobal('getSupabaseAdmin', () => ({ from }))
  vi.resetModules()
  const { default: handler } = await import('../server/api/hermes/social-publications-audit.get')
  return { result: await handler({} as any), request, from, auth }
}
afterEach(() => vi.unstubAllGlobals())
describe('read-only social audit', () => {
  it('scopes all statuses to one organization and reports an actually complete empty query', async () => {
    const { result, request, auth } = await run()
    expect(auth).toHaveBeenCalledOnce()
    expect(request.eq).toHaveBeenCalledWith('organization_id', 'org1')
    expect(result.scope.statuses).toEqual([])
    expect(result.pagination).toEqual({ cursor: null, nextCursor: null, complete: true })
    expect(result.posts).toEqual([])
  })
  it('rejects unauthorized and malformed cursors', async () => {
    await expect(run([], {}, { unauthorized: true })).rejects.toThrow('unauthorized')
    await expect(run([], { cursor: 'injected' })).rejects.toThrow('Curseur invalide')
  })
  it('exposes stored receipt without inventing approval, destination or attempt identity', async () => {
    const { result } = await run([{ id: 'id', platform: 'linkedin', content: 'exact', version: 4, status: 'publishing', external_post_id: 'receipt-old', external_post_url: 'https://example.com/receipt', published_at: null }])
    expect(result.posts[0]).toMatchObject({ content: 'exact', status: 'publishing', approval: null, latestAttempt: null, destinationID: null, scheduledAt: null, receipt: { id: 'receipt-old' } })
  })
  it('does not call the last page a complete export or silently truncate the first', async () => {
    const rows = Array.from({ length: 101 }, (_, i) => ({ id: String(i) }))
    const first = await run(rows)
    expect(first.result.posts).toHaveLength(100)
    expect(first.result.pagination).toEqual({ cursor: null, nextCursor: '99', complete: false })
    const cursor = '00000000-0000-0000-0000-000000000001'
    const last = await run([], { cursor })
    expect(last.request.gt).toHaveBeenCalledWith('id', cursor)
    expect(last.result.pagination).toEqual({ cursor, nextCursor: null, complete: false })
  })
  it('returns a generic failure rather than a false empty file or database details', async () => {
    await expect(run([], {}, { error: true })).rejects.toThrow('Audit social indisponible')
  })
})
