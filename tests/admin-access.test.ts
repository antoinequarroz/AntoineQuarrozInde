import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('admin access restriction', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('createError', (input: any) => Object.assign(new Error(input.message), input))
    vi.doMock('../server/utils/adminMfa', () => ({ requireAdminMfa: vi.fn().mockResolvedValue(undefined) }))
  })

  it('allows organization managers when no email restriction is configured', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ adminEmail: '', e2eAdminEmail: '' }))
    vi.doMock('../server/utils/organizationAccess', () => ({
      resolveOrganizationContext: vi.fn().mockImplementation(async (event: any) => {
        event.context.user = { id: 'user-1', email: 'manager@example.test' }
        return { id: 'org-1', role: 'manager' }
      }),
    }))

    const { requireAdmin } = await import('../server/utils/requireAdmin')
    await expect(requireAdmin({ context: {} })).resolves.toMatchObject({
      user: { email: 'manager@example.test' },
      org: { id: 'org-1' },
    })

    const { requireAdminMfa } = await import('../server/utils/adminMfa')
    expect(requireAdminMfa).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'user-1' }))
  })

  it('enforces ADMIN_EMAIL case-insensitively when configured', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ adminEmail: 'owner@example.test', e2eAdminEmail: '' }))
    vi.doMock('../server/utils/organizationAccess', () => ({
      resolveOrganizationContext: vi.fn().mockImplementation(async (event: any) => {
        event.context.user = { id: 'user-2', email: 'other@example.test' }
        return { id: 'org-1', role: 'admin' }
      }),
    }))

    const { requireAdmin } = await import('../server/utils/requireAdmin')
    await expect(requireAdmin({ context: {} })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows the dedicated E2E manager only inside the isolated sandbox', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      adminEmail: 'owner@example.test',
      e2eAdminEmail: 'e2e-admin@example.test',
    }))
    vi.doMock('../server/utils/organizationAccess', () => ({
      resolveOrganizationContext: vi.fn().mockImplementation(async (event: any) => {
        event.context.user = { id: 'user-e2e', email: 'E2E-ADMIN@example.test' }
        return { id: 'org-e2e', role: 'manager', slug: 'aq-e2e-sandbox' }
      }),
    }))

    const { requireAdmin } = await import('../server/utils/requireAdmin')
    await expect(requireAdmin({ context: {} })).resolves.toMatchObject({
      user: { id: 'user-e2e' },
      org: { id: 'org-e2e', slug: 'aq-e2e-sandbox' },
    })
  })

  it('keeps the dedicated E2E account blocked outside the sandbox', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      adminEmail: 'owner@example.test',
      e2eAdminEmail: 'e2e-admin@example.test',
    }))
    vi.doMock('../server/utils/organizationAccess', () => ({
      resolveOrganizationContext: vi.fn().mockImplementation(async (event: any) => {
        event.context.user = { id: 'user-e2e', email: 'e2e-admin@example.test' }
        return { id: 'org-main', role: 'manager', slug: 'antoine-quarroz' }
      }),
    }))

    const { requireAdmin } = await import('../server/utils/requireAdmin')
    await expect(requireAdmin({ context: {} })).rejects.toMatchObject({ statusCode: 403 })
  })
})
