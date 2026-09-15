import { beforeEach, describe, expect, it, vi } from 'vitest'

function query(result: any) {
  const value: any = {}
  for (const method of ['select', 'eq', 'order', 'range']) value[method] = () => value
  value.then = (resolve: (input: any) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(result).then(resolve, reject)
  return value
}

describe('admin delivery monitoring', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('requireAdmin', vi.fn().mockResolvedValue({ org: { id: 'org-1' } }))
    vi.stubGlobal('getQuery', () => ({ limit: '500', page: '0' }))
    vi.stubGlobal('createError', (input: object) => Object.assign(new Error('request failed'), input))
  })

  it('returns only tenant-scoped metadata without exposing message bodies', async () => {
    const range = vi.fn()
    const rows = [{ id: 1, client_id: 2, category: 'transactional', template_key: 'invoice_available', locale: 'de', recipient: 'client@example.com', entity_type: 'invoice', entity_id: '42', status: 'sent', provider_id: 'mail-1', attempt_count: 1, error_code: null, created_at: '2026-09-15T08:00:00Z', last_attempt_at: '2026-09-15T08:00:00Z', sent_at: '2026-09-15T08:00:01Z' }]
    const builder = query({ data: rows, count: 1, error: null })
    builder.range = (...args: any[]) => { range(...args); return builder }
    const eq = vi.fn(() => builder)
    builder.eq = eq
    vi.stubGlobal('getSupabaseAdmin', () => ({ from: () => builder }))

    const { default: handler } = await import('../server/api/admin/emails.get')
    const result = await handler({ context: {} } as never)

    expect(eq).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(range).toHaveBeenCalledWith(0, 99)
    expect(result).toMatchObject({ counts: { total: 1, sent: 1, attention: 0 }, total: 1, hasMore: false })
    expect(result.emails[0]).toMatchObject({ locale: 'de', attempts: 1, canRetry: false })
    expect(JSON.stringify(result)).not.toContain('html')
    expect(JSON.stringify(result)).not.toContain('text')
  })

  it('fails safely without exposing a database error', async () => {
    vi.stubGlobal('getSupabaseAdmin', () => ({ from: () => query({ data: null, count: null, error: { message: 'secret detail' } }) }))
    const { default: handler } = await import('../server/api/admin/emails.get')
    await expect(handler({ context: {} } as never)).rejects.toMatchObject({ statusCode: 500, message: 'L’historique des e-mails ne peut pas être chargé.' })
  })
})
