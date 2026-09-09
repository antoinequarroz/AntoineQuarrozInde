import { beforeEach, describe, expect, it, vi } from 'vitest'

const lumailSend = vi.fn()

vi.mock('lumail', () => ({
  Lumail: class {
    emails = { send: lumailSend }
  },
}))

describe('email transport', () => {
  beforeEach(() => {
    vi.resetModules()
    lumailSend.mockReset().mockResolvedValue({ data: { id: 'lum_123' }, error: null })
    vi.stubGlobal('createError', (input: unknown) => input)
  })

  it('uses Lumail first for transactional messages', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ lumailApiKey: 'lum_key', emailFrom: 'info@antoinequarroz.ch' }))
    const { sendAppEmail } = await import('../server/utils/emailTransport')

    await expect(sendAppEmail({ to: 'client@example.com', subject: 'Bonjour', html: '<p>Bonjour</p>', idempotencyKey: 'message-1' }))
      .resolves.toEqual({ emailId: 'lum_123', provider: 'lumail' })
    expect(lumailSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'client@example.com', subject: 'Bonjour' }), { idempotencyKey: 'message-1' })
  })

  it('requires Lumail configuration', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ lumailApiKey: '', emailFrom: 'info@antoinequarroz.ch' }))
    const { isEmailConfigured, sendAppEmail } = await import('../server/utils/emailTransport')

    expect(isEmailConfigured()).toBe(false)
    await expect(sendAppEmail({ to: 'client@example.com', subject: 'Bonjour', text: 'Bonjour' }))
      .rejects.toMatchObject({ statusCode: 503 })
  })
})
