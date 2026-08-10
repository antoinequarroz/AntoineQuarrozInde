import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

function httpError(input: { statusCode: number, message: string }) {
  return Object.assign(new Error(input.message), input)
}

describe('portal quote rejection', () => {
  let handler: (event: unknown) => Promise<{ rejected: boolean, duplicate?: boolean }>
  let body: Record<string, unknown>
  let quote: Record<string, unknown> | null
  let updated: Record<string, unknown> | null
  let updatePayload: Record<string, unknown> | undefined
  let audit: ReturnType<typeof vi.fn>

  beforeAll(async () => {
    vi.stubGlobal('defineEventHandler', (value: unknown) => value)
    handler = (await import('../server/api/portal/quotes/reject.post')).default as typeof handler
  })

  beforeEach(() => {
    body = { quoteId: 42, confirmed: true }
    quote = { id: 42, number: 'DEV-2026-0042', title: 'Portail client', status: 'sent' }
    updated = { id: 42, status: 'rejected' }
    updatePayload = undefined
    audit = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('requirePortalClient', () => Promise.resolve({ org: { id: 'org-test' }, user: { id: 'user-test' }, client: { id: 7 } }))
    vi.stubGlobal('readBody', () => Promise.resolve(body))
    vi.stubGlobal('createError', httpError)
    vi.stubGlobal('logAudit', audit)
    vi.stubGlobal('getSupabaseAdmin', () => ({
      from: () => {
        let updating = false
        const query = {
          select: () => query,
          eq: () => query,
          neq: () => query,
          update: (payload: Record<string, unknown>) => { updating = true; updatePayload = payload; return query },
          maybeSingle: () => Promise.resolve({ data: updating ? updated : quote, error: null }),
        }
        return query
      },
    }))
  })

  it('atomically rejects a sent quote owned by the authenticated client', async () => {
    await expect(handler({})).resolves.toEqual({ rejected: true })
    expect(updatePayload).toEqual({ status: 'rejected' })
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-test',
      actorUserId: 'user-test',
      action: 'quote.portal_rejected',
      entityId: 42,
      clientId: 7,
    }))
  })

  it('requires explicit confirmation', async () => {
    body = { quoteId: 42, confirmed: false }
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(updatePayload).toBeUndefined()
  })

  it('is idempotent for an already rejected quote', async () => {
    quote = { ...quote, status: 'rejected' }
    await expect(handler({})).resolves.toEqual({ rejected: true, duplicate: true })
    expect(updatePayload).toBeUndefined()
    expect(audit).not.toHaveBeenCalled()
  })

  it('does not replace an accepted decision', async () => {
    quote = { ...quote, status: 'accepted' }
    await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
    expect(updatePayload).toBeUndefined()
  })
})
