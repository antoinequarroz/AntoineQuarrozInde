import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeAdminMfaMode,
  normalizeTotpCode,
  requiresAdminMfa,
  safeAdminRedirect,
  safeMfaRedirect,
  safePortalRedirect,
} from '../app/utils/adminMfa'

describe('admin MFA policy', () => {
  it('keeps optional accounts without a factor usable and steps up enrolled accounts', () => {
    expect(requiresAdminMfa('optional', 'aal1', 'aal1', true)).toBe(false)
    expect(requiresAdminMfa('optional', 'aal1', 'aal2', true)).toBe(true)
    expect(requiresAdminMfa('optional', 'aal2', 'aal2', true)).toBe(false)
  })

  it('requires enrollment in required mode and fails closed when assurance is unknown', () => {
    expect(requiresAdminMfa('required', 'aal1', 'aal1', true)).toBe(true)
    expect(requiresAdminMfa('required', 'aal2', 'aal2', true)).toBe(false)
    expect(requiresAdminMfa('optional', null, null, false)).toBe(true)
  })

  it('fails closed for invalid configured modes while keeping the explicit optional mode', () => {
    expect(normalizeAdminMfaMode('optional')).toBe('optional')
    expect(normalizeAdminMfaMode('required')).toBe('required')
    expect(normalizeAdminMfaMode('disabled')).toBe('required')
    expect(normalizeAdminMfaMode(undefined)).toBe('required')
  })

  it('normalizes pasted TOTP values and rejects unsafe redirects', () => {
    expect(normalizeTotpCode(' 12 34-56abc789 ')).toBe('123456')
    expect(safeAdminRedirect('/admin/projects/42?tab=tasks')).toBe('/admin/projects/42?tab=tasks')
    expect(safeAdminRedirect('https://attacker.example')).toBe('/admin')
    expect(safeAdminRedirect('//attacker.example')).toBe('/admin')
    expect(safeAdminRedirect('/admin/security?redirect=/admin')).toBe('/admin')
    expect(safeAdminRedirect('/admin/login')).toBe('/admin')
    expect(safePortalRedirect('/portal?tab=factures')).toBe('/portal?tab=factures')
    expect(safePortalRedirect('/portal/login?redirect=/portal')).toBe('/portal')
    expect(safePortalRedirect('/admin')).toBe('/portal')
    expect(safeMfaRedirect('/portal/project/42')).toBe('/portal/project/42')
    expect(safeMfaRedirect('https://attacker.example')).toBe('/admin')
  })
})

describe('auth store MFA ordering', () => {
  const calls: string[] = []
  const runtime = { public: { adminMfaMode: 'optional' } }
  const assurance = { currentLevel: 'aal1', nextLevel: 'aal1' }

  beforeEach(() => {
    vi.resetModules()
    calls.length = 0
    runtime.public.adminMfaMode = 'optional'
    assurance.currentLevel = 'aal1'
    assurance.nextLevel = 'aal1'

    vi.stubGlobal('ref', <T>(value: T) => ({ value }))
    vi.stubGlobal('computed', <T>(getter: () => T) => ({ get value() { return getter() } }))
    vi.stubGlobal('defineStore', (_name: string, setup: () => unknown) => setup)
    vi.stubGlobal('useRuntimeConfig', () => runtime)
    vi.stubGlobal('useSupabaseClient', () => ({
      auth: {
        getSession: vi.fn(async () => ({
          data: {
            session: {
              access_token: 'access-token',
              user: { email: 'owner@example.test' },
            },
          },
        })),
        getUser: vi.fn(),
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn(async () => {
            calls.push('assurance')
            return { data: { ...assurance, currentAuthenticationMethods: [] }, error: null }
          }),
        },
      },
    }))
    vi.stubGlobal('$fetch', vi.fn(async () => {
      calls.push('organizations')
      return [{ id: 'org-a', name: 'A', slug: 'a', role: 'owner' }]
    }))
  })

  it('checks assurance before loading organizations when no step-up is needed', async () => {
    const { useAuthStore } = await import('../app/stores/auth')
    const store = useAuthStore() as ReturnType<typeof useAuthStore> & {
      requiresAdminMfa: { value: boolean }
    }

    await store.checkSession({ deferOrganizationsUntilMfa: true })

    expect(calls).toEqual(['assurance', 'organizations'])
    expect(store.requiresAdminMfa.value).toBe(false)
  })

  it('does not load organizations before an enrolled optional account reaches AAL2', async () => {
    assurance.nextLevel = 'aal2'
    const { useAuthStore } = await import('../app/stores/auth')
    const store = useAuthStore() as ReturnType<typeof useAuthStore> & {
      requiresAdminMfa: { value: boolean }
      organizations: { value: unknown[] }
    }

    await store.checkSession({ deferOrganizationsUntilMfa: true })

    expect(calls).toEqual(['assurance'])
    expect(store.requiresAdminMfa.value).toBe(true)
    expect(store.organizations.value).toEqual([])
  })

  it('does not load organizations before required enrollment', async () => {
    runtime.public.adminMfaMode = 'required'
    const { useAuthStore } = await import('../app/stores/auth')
    const store = useAuthStore() as ReturnType<typeof useAuthStore> & {
      requiresAdminMfa: { value: boolean }
    }

    await store.checkSession({ deferOrganizationsUntilMfa: true })

    expect(calls).toEqual(['assurance'])
    expect(store.requiresAdminMfa.value).toBe(true)
  })

  it('defers portal organizations only for an already enrolled MFA account', async () => {
    runtime.public.adminMfaMode = 'required'
    const { useAuthStore } = await import('../app/stores/auth')
    const store = useAuthStore() as ReturnType<typeof useAuthStore> & {
      requiresMfaChallenge: { value: boolean }
    }

    await store.checkSession({ deferOrganizationsUntilMfaChallenge: true })
    expect(calls).toEqual(['assurance', 'organizations'])
    expect(store.requiresMfaChallenge.value).toBe(false)

    calls.length = 0
    assurance.nextLevel = 'aal2'
    await store.checkSession({ deferOrganizationsUntilMfaChallenge: true })
    expect(calls).toEqual(['assurance'])
    expect(store.requiresMfaChallenge.value).toBe(true)
  })
})

describe('admin MFA interface wiring', () => {
  const securityPage = readFileSync(new URL('../app/pages/admin/security.vue', import.meta.url), 'utf8')
  const adminMiddleware = readFileSync(new URL('../app/middleware/admin.ts', import.meta.url), 'utf8')
  const viewerMiddleware = readFileSync(new URL('../app/middleware/project-viewer.ts', import.meta.url), 'utf8')
  const loginPage = readFileSync(new URL('../app/pages/admin/login.vue', import.meta.url), 'utf8')
  const adminLayout = readFileSync(new URL('../app/layouts/admin.vue', import.meta.url), 'utf8')
  const portalMiddleware = readFileSync(new URL('../app/middleware/portal.ts', import.meta.url), 'utf8')
  const portalLoginPage = readFileSync(new URL('../app/pages/portal/login.vue', import.meta.url), 'utf8')
  const config = readFileSync(new URL('../nuxt.config.ts', import.meta.url), 'utf8')
  const compose = readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8')
  const playwrightConfig = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8')
  const globalSetup = readFileSync(new URL('../e2e/global-setup.ts', import.meta.url), 'utf8')
  const adminAuth = readFileSync(new URL('../e2e/helpers/admin-auth.ts', import.meta.url), 'utf8')

  it('offers the complete TOTP lifecycle with accessible verification controls', () => {
    expect(securityPage).toContain("client.auth.mfa.enroll")
    expect(securityPage).toContain('challengeAndVerify')
    expect(securityPage).toContain('client.auth.mfa.unenroll')
    expect(securityPage).toContain('<img :src="enrollment.qrCode"')
    expect(securityPage).toContain('{{ enrollment.secret }}')
    expect(securityPage).toContain('autocomplete="one-time-code"')
    expect(securityPage).toContain('inputmode="numeric"')
    expect(securityPage).toContain('role="alert"')
    expect(securityPage).toContain('aria-live="polite"')
    expect(securityPage).toContain('le mode requis interdit de retirer la dernière')
    expect(securityPage).toContain("focusElement('enrollment-title')")
    expect(securityPage).toContain('focusElement(removalCancelId(factorId))')
    expect(securityPage).toContain('focusElement(removalTriggerId(factorId))')
  })

  it('gates both admin middleware paths and resumes safe destinations after login', () => {
    expect(adminMiddleware).toContain('deferOrganizationsUntilMfa: true')
    expect(adminMiddleware).toContain("to.path === '/admin/security'")
    expect(adminMiddleware).toContain("path: '/admin/security'")
    expect(viewerMiddleware).toContain("path: '/admin/security'")
    expect(loginPage).toContain('auth.requiresAdminMfa')
    expect(loginPage).toContain('safeAdminRedirect(route.query.redirect)')
    expect(adminMiddleware).toContain("? ['owner', 'admin', 'manager', 'viewer']")
  })

  it('steps up enrolled portal sessions without loading organizations first', () => {
    expect(portalMiddleware).toContain('deferOrganizationsUntilMfaChallenge: true')
    expect(portalMiddleware).toContain('auth.requiresMfaChallenge')
    expect(portalMiddleware).toContain("path: '/admin/security'")
    expect(portalLoginPage).toContain('deferOrganizationsUntilMfaChallenge: true')
    expect(portalLoginPage).toContain('auth.requiresMfaChallenge')
    expect(portalLoginPage).toContain('safePortalRedirect(route.query.redirect)')
    expect(securityPage).toContain('safeMfaRedirect(route.query.redirect)')
  })

  it('exposes the security settings and a deployable runtime policy', () => {
    expect(adminLayout).toContain("{ label: 'Sécurité', icon: 'shield', href: '/admin/security' }")
    expect(config).toContain("adminMfaMode: process.env.NUXT_PUBLIC_ADMIN_MFA_MODE || process.env.ADMIN_MFA_MODE || 'optional'")
    expect(compose).toContain('NUXT_PUBLIC_ADMIN_MFA_MODE: ${ADMIN_MFA_MODE:-optional}')
  })

  it('authenticates the E2E suite once and removes the reusable AAL2 state afterwards', () => {
    expect(playwrightConfig).toContain("globalSetup: './e2e/global-setup.ts'")
    expect(globalSetup).toContain('await loginAdmin(page)')
    expect(globalSetup).toContain(".aal === 'aal2'")
    expect(globalSetup).toContain('await context.storageState({ path: adminStorageStatePath })')
    expect(globalSetup).toContain('return cleanup')
    expect(adminAuth).toContain('restoreAdminStorageState(page)')
    expect(adminAuth).toContain("await page.goto('/')")
    expect(adminAuth).not.toContain('page.addInitScript')
    expect(adminAuth).toContain("resolve(process.cwd(), 'playwright/.auth/admin.json')")
  })
})
