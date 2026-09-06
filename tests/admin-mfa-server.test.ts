import { beforeEach, describe, expect, it, vi } from 'vitest'

type AssuranceLevel = 'aal1' | 'aal2' | null | string

function setup(currentLevel: AssuranceLevel, nextLevel: AssuranceLevel) {
  const getAuthenticatorAssuranceLevel = vi.fn().mockResolvedValue({
    data: { currentLevel, nextLevel, currentAuthenticationMethods: [] },
    error: null,
  })

  vi.stubGlobal('useRuntimeConfig', () => ({ public: { adminMfaMode: 'optional' } }))
  vi.stubGlobal('getHeader', (_event: unknown, name: string) => (
    name === 'authorization' ? 'Bearer valid-access-token' : null
  ))
  vi.stubGlobal('getSupabaseAdmin', () => ({
    auth: {
      getUser: vi.fn(),
      mfa: { getAuthenticatorAssuranceLevel },
    },
  }))

  return getAuthenticatorAssuranceLevel
}

describe('server administrator MFA assurance validation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.stubGlobal('createError', (input: any) => Object.assign(new Error(input.statusMessage), input))
  })

  it.each([
    [null, 'aal1'],
    ['aal1', null],
    [null, null],
    ['aal3', 'aal2'],
    ['aal1', 'unknown'],
  ])('rejects unknown assurance levels current=%s next=%s', async (currentLevel, nextLevel) => {
    setup(currentLevel, nextLevel)
    const { requireAdminMfa } = await import('../server/utils/adminMfa')

    await expect(requireAdminMfa({ context: {} }, { factors: [] }))
      .rejects.toMatchObject({
        statusCode: 401,
        data: { code: 'MFA_ASSURANCE_INVALID' },
      })
  })

  it.each([
    ['aal1', 'aal1'],
    ['aal2', 'aal2'],
  ])('accepts recognized assurance values current=%s next=%s before applying policy', async (currentLevel, nextLevel) => {
    const getAuthenticatorAssuranceLevel = setup(currentLevel, nextLevel)
    const { requireAdminMfa } = await import('../server/utils/adminMfa')

    await expect(requireAdminMfa({ context: {} }, { factors: [] })).resolves.toMatchObject({
      mode: 'optional',
      currentLevel,
      hasVerifiedFactor: nextLevel === 'aal2',
    })
    expect(getAuthenticatorAssuranceLevel).toHaveBeenCalledWith('valid-access-token')
  })

  it.each(['optional', 'required'])('requires an AAL2 challenge in %s mode when Supabase reports aal2 as reachable', async (mode) => {
    setup('aal1', 'aal2')
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { adminMfaMode: mode } }))
    const { requireAdminMfa } = await import('../server/utils/adminMfa')

    await expect(requireAdminMfa({ context: {} }, { factors: [] }))
      .rejects.toMatchObject({
        statusCode: 403,
        data: { code: 'MFA_REQUIRED' },
      })
  })
})
