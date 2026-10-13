import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('on-demand Supabase client', () => {
  const client = { auth: { getSession: vi.fn() } }
  const createClient = vi.fn()
  let sdkLoads = 0
  let publicConfig = {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'public-anon-key',
    supabasePublishableKey: '',
  }

  beforeEach(() => {
    vi.resetModules()
    sdkLoads = 0
    createClient.mockReset().mockReturnValue(client)
    publicConfig = {
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
      supabasePublishableKey: '',
    }
    vi.stubGlobal('useRuntimeConfig', () => ({ public: publicConfig }))
    vi.stubGlobal('createError', (details: { message: string }) => new Error(details.message))
    vi.doMock('@supabase/supabase-js', () => {
      sdkLoads += 1
      return { createClient }
    })
  })

  it('does not load the account SDK while the public module is imported', async () => {
    await import('../app/composables/useSupabaseClient')

    expect(sdkLoads).toBe(0)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('shares the pending client between concurrent account actions', async () => {
    const { useSupabaseClient } = await import('../app/composables/useSupabaseClient')

    const first = useSupabaseClient()
    const second = useSupabaseClient()
    expect(second).toBe(first)
    expect(await first).toBe(client)
    expect(await useSupabaseClient()).toBe(client)
    expect(sdkLoads).toBe(1)
    expect(createClient).toHaveBeenCalledTimes(1)
  })

  it('captures runtime configuration before the deferred import resolves', async () => {
    const { useSupabaseClient } = await import('../app/composables/useSupabaseClient')

    const pending = useSupabaseClient()
    publicConfig.supabaseUrl = 'https://other.supabase.co'
    publicConfig.supabaseAnonKey = 'another-key'
    await pending

    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'public-anon-key')
  })

  it('allows another account attempt after initialization fails', async () => {
    createClient.mockImplementationOnce(() => { throw new Error('SDK initialization failed') })
    const { useSupabaseClient } = await import('../app/composables/useSupabaseClient')

    await expect(useSupabaseClient()).rejects.toThrow('SDK initialization failed')
    expect(await useSupabaseClient()).toBe(client)
    expect(createClient).toHaveBeenCalledTimes(2)
  })

  it('does not load the SDK without public configuration and supports publishable keys', async () => {
    publicConfig.supabaseAnonKey = ''
    const { useSupabaseClient } = await import('../app/composables/useSupabaseClient')

    expect(() => useSupabaseClient()).toThrow('Supabase client config is missing')
    expect(sdkLoads).toBe(0)
    publicConfig.supabasePublishableKey = 'public-publishable-key'
    await useSupabaseClient()
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'public-publishable-key')
  })
})
