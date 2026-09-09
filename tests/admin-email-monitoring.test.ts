import { beforeEach, describe, expect, it, vi } from 'vitest'

const listEmails = vi.fn()

vi.mock('lumail', () => ({
  Lumail: class {
    emails = { list: listEmails }
  },
}))

describe('admin Lumail monitoring', () => {
  beforeEach(() => {
    vi.resetModules()
    listEmails.mockReset()
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('requireAdmin', vi.fn().mockResolvedValue({ org: { id: 'org-1' } }))
    vi.stubGlobal('useRuntimeConfig', () => ({ lumailApiKey: 'lumail_test_key' }))
    vi.stubGlobal('getQuery', () => ({ limit: '500', after: 'email-cursor' }))
    vi.stubGlobal('createError', (input: object) => Object.assign(new Error('request failed'), input))
  })

  it('returns metadata and summaries without exposing message bodies', async () => {
    listEmails.mockResolvedValue({
      data: {
        has_more: true,
        data: [
          {
            id: 'email-1',
            message_id: 'message-1',
            to: ['client@example.com'],
            from: 'info@antoinequarroz.ch',
            subject: 'Votre projet',
            created_at: '2026-09-09T08:00:00.000Z',
            last_event: 'opened',
            html: '<p>contenu privé</p>',
            text: 'contenu privé',
            tags: [{ name: 'category', value: 'project_update' }],
          },
        ],
      },
      error: null,
    })

    const { default: handler } = await import('../server/api/admin/emails.get')
    const result = await handler({ context: {} } as never)

    expect(globalThis.requireAdmin).toHaveBeenCalledOnce()
    expect(listEmails).toHaveBeenCalledWith({ limit: 100, after: 'email-cursor', before: undefined })
    expect(result).toMatchObject({
      counts: { total: 1, delivered: 1, engaged: 1, attention: 0, pending: 0 },
      hasMore: true,
      nextCursor: 'email-1',
    })
    expect(JSON.stringify(result)).not.toContain('contenu privé')
  })

  it('fails safely when Lumail is unavailable', async () => {
    listEmails.mockResolvedValue({ data: null, error: { message: 'provider secret detail' } })

    const { default: handler } = await import('../server/api/admin/emails.get')

    await expect(handler({ context: {} } as never)).rejects.toMatchObject({
      statusCode: 502,
      message: 'Lumail ne peut pas fournir l’historique pour le moment.',
    })
  })

  it('does not contact Lumail when the server key is missing', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ lumailApiKey: '' }))
    const { default: handler } = await import('../server/api/admin/emails.get')

    await expect(handler({ context: {} } as never)).rejects.toMatchObject({ statusCode: 503 })
    expect(listEmails).not.toHaveBeenCalled()
  })
})
