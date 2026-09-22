import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const createSubscriber = vi.fn()
const updateSubscriber = vi.fn()

vi.mock('lumail', () => ({
  Lumail: class {
    subscribers = { create: createSubscriber, update: updateSubscriber }
  },
}))

describe('Lumail newsletter synchronization', () => {
  const input = {
    email: 'reader@example.com',
    locale: 'fr' as const,
    sourcePath: '/blog/example',
    consentedAt: '2026-09-21T16:00:00.000Z',
  }

  beforeEach(() => {
    vi.resetModules()
    createSubscriber.mockReset().mockResolvedValue({ data: { id: 'sub_123', status: 'PENDING_CONFIRMATION' }, error: null })
    updateSubscriber.mockReset()
    vi.stubGlobal('useRuntimeConfig', () => ({ lumailApiKey: 'lum_key' }))
    vi.stubGlobal('createError', (value: unknown) => value)
  })

  it('adds the consented reader to the Lumail newsletter audience', async () => {
    const { syncLumailNewsletterSubscriber } = await import('../server/utils/lumailNewsletter')

    await expect(syncLumailNewsletterSubscriber(input)).resolves.toEqual({
      id: 'sub_123',
      status: 'PENDING_CONFIRMATION',
    })
    expect(createSubscriber).toHaveBeenCalledWith(expect.objectContaining({
      email: input.email,
      tags: ['newsletter', 'blog'],
      fields: expect.objectContaining({
        locale: 'fr',
        source_article: '/blog/example',
        consented_at: input.consentedAt,
      }),
      triggerWorkflows: true,
      skipDoubleOptIn: false,
    }))
  })

  it('updates an existing Lumail subscriber when creation reports a conflict', async () => {
    createSubscriber.mockResolvedValue({ data: null, error: { statusCode: 409, message: 'Already exists' } })
    updateSubscriber.mockResolvedValue({ data: { id: 'sub_123', status: 'SUBSCRIBED' }, error: null })
    const { syncLumailNewsletterSubscriber } = await import('../server/utils/lumailNewsletter')

    await expect(syncLumailNewsletterSubscriber(input)).resolves.toEqual({ id: 'sub_123', status: 'SUBSCRIBED' })
    expect(updateSubscriber).toHaveBeenCalledWith(input.email, expect.objectContaining({ resubscribe: true }))
  })

  it('refuses a local-only success when Lumail is unavailable', async () => {
    createSubscriber.mockResolvedValue({ data: null, error: { statusCode: 503, message: 'Unavailable' } })
    const { syncLumailNewsletterSubscriber } = await import('../server/utils/lumailNewsletter')

    await expect(syncLumailNewsletterSubscriber(input)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('requires Lumail synchronization before recording a successful local subscription', async () => {
    const endpoint = await readFile('server/api/newsletter.post.ts', 'utf8')
    const lumailSync = endpoint.indexOf('await syncLumailNewsletterSubscriber')
    const localWrite = endpoint.indexOf(".from('newsletter_subscriptions')")

    expect(lumailSync).toBeGreaterThan(-1)
    expect(localWrite).toBeGreaterThan(lumailSync)
    expect(endpoint).toContain('lumail_subscriber_id: lumailSubscriber.id')
    expect(endpoint).toContain('lumail_synced_at: consentedAt')
  })
})
