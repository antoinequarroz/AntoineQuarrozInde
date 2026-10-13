import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import { safeAdminRedirect, safePortalRedirect } from '../app/utils/adminMfa'

function loginForm(kind: 'admin' | 'portal', needsMfa = false) {
  const source = readFileSync(new URL(`../app/pages/${kind}/login.vue`, import.meta.url), 'utf8')
  const script = parse(source).descriptor.scriptSetup?.content
  if (!script) throw new Error('Login script missing')
  const compiled = ts.transpileModule(script, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  const auth = {
    login: vi.fn().mockResolvedValue(true),
    requiresAdminMfa: needsMfa,
    requiresMfaChallenge: needsMfa,
  }
  const redirect = kind === 'admin' ? '/admin/projects' : '/portal?tab=factures'
  const navigate = vi.fn(async () => {})
  // Execute the actual Vue form handler rather than reimplementing it.
  const setup = new Function('ref', 'definePageMeta', 'useAuthStore', 'useRoute', 'onMounted',
    'safeAdminRedirect', 'safePortalRedirect', 'navigateTo', '$fetch',
    `${compiled}\nreturn { email, password, message: ${kind === 'admin' ? 'error' : 'errorMessage'}, submit: ${kind === 'admin' ? 'handleLogin' : 'submit'} };`)
  const form = setup(<T>(value: T) => ({ value }), () => {}, () => auth,
    () => ({ query: { redirect } }), () => {}, safeAdminRedirect, safePortalRedirect, navigate, vi.fn()) as {
    email: { value: string }
    password: { value: string }
    message: { value: string }
    submit: () => Promise<void>
  }
  form.email.value = 'person@example.test'
  form.password.value = 'test-password'
  return { form, auth, navigate, redirect }
}

describe.each(['admin', 'portal'] as const)('%s login recovery', (kind) => {
  it('reports a failed deferred SDK without redirecting and permits a new attempt', async () => {
    const state = loginForm(kind)
    state.auth.login.mockRejectedValueOnce(new Error('Chunk load failed'))

    await expect(state.form.submit()).resolves.toBeUndefined()
    expect(state.form.message.value).toContain('Vérifiez votre connexion puis réessayez')
    expect(state.form.password.value).toBe('test-password')
    expect(state.navigate).not.toHaveBeenCalled()

    await state.form.submit()
    expect(state.form.message.value).toBe('')
    expect(state.navigate).toHaveBeenCalledWith(state.redirect, { replace: true })
    expect(state.auth.login).toHaveBeenLastCalledWith('person@example.test', 'test-password', kind === 'admin'
      ? { deferOrganizationsUntilMfa: true }
      : { deferOrganizationsUntilMfaChallenge: true })
  })

  it('retains the existing incorrect-credentials behavior', async () => {
    const state = loginForm(kind)
    state.auth.login.mockResolvedValueOnce(false)
    await state.form.submit()

    expect(state.form.message.value).toBe(kind === 'admin' ? 'Identifiants invalides.' : 'E-mail ou mot de passe incorrect.')
    expect(state.form.password.value).toBe(kind === 'admin' ? '' : 'test-password')
    expect(state.navigate).not.toHaveBeenCalled()
  })

  it('preserves the MFA challenge and safe destination after successful login', async () => {
    const state = loginForm(kind, true)
    await state.form.submit()

    expect(state.navigate).toHaveBeenCalledWith({
      path: '/admin/security', query: { redirect: state.redirect },
    }, { replace: true })
    expect(state.form.message.value).toBe('')
  })
})
