import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('quote conversion API', () => {
  const rpc = vi.fn()
  const logAudit = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    rpc.mockReset()
    logAudit.mockReset()
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('requireAdmin', vi.fn().mockResolvedValue({
      org: { id: 'org-test' },
      user: { id: 'user-test' },
    }))
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({
      id: 42,
      confirmation: 'ACCEPTER_ET_FACTURER',
    }))
    vi.stubGlobal('getSupabaseAdmin', () => ({ rpc }))
    vi.stubGlobal('logAudit', logAudit)
    vi.stubGlobal('createError', (input: object) => Object.assign(new Error('request failed'), input))
  })

  it('delegates the conversion to the tenant-scoped atomic function', async () => {
    const invoice = {
      id: 73,
      client_id: 12,
      project_id: 21,
      number: 'FAC-2026-0001',
    }
    rpc.mockResolvedValue({ data: { created: true, invoice }, error: null })

    const { default: handler } = await import('../server/api/quotes/convert.post')

    await expect(handler({} as never)).resolves.toEqual({ created: true, invoice })
    expect(rpc).toHaveBeenCalledWith('convert_quote_to_invoice_atomic', {
      p_organization_id: 'org-test',
      p_quote_id: 42,
    })
    expect(logAudit).toHaveBeenCalledOnce()
  })

  it('returns an existing invoice without writing a duplicate audit', async () => {
    const invoice = { id: 73, client_id: 12, number: 'FAC-2026-0001' }
    rpc.mockResolvedValue({ data: { created: false, invoice }, error: null })

    const { default: handler } = await import('../server/api/quotes/convert.post')

    await expect(handler({} as never)).resolves.toEqual({ created: false, invoice })
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('rejects conversion without the explicit confirmation token', async () => {
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ id: 42 }))

    const { default: handler } = await import('../server/api/quotes/convert.post')

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Confirme explicitement'),
    })
    expect(rpc).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('maps database failures without exposing internal SQL details', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'secret host and internal SQL details' },
    })

    const { default: handler } = await import('../server/api/quotes/convert.post')

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 500,
      message: 'La conversion transactionnelle du devis a échoué.',
    })
  })

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid quote id %s before the database', async (id) => {
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({
      id,
      confirmation: 'ACCEPTER_ET_FACTURER',
    }))

    const { default: handler } = await import('../server/api/quotes/convert.post')

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 400 })
    expect(rpc).not.toHaveBeenCalled()
  })
})
