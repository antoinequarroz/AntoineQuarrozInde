import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

function activationForm(options: {
  client?: () => Promise<unknown>
  updateError?: unknown
  activate?: () => Promise<unknown>
} = {}) {
  const source = readFileSync(new URL('../app/pages/portal/setup.vue', import.meta.url), 'utf8')
  const script = parse(source).descriptor.scriptSetup?.content
  if (!script) throw new Error('Portal setup script missing')
  // Execute the real form action with its external dependencies replaced;
  // the submit behavior is not reproduced in the test.
  const compiled = ts.transpileModule(script, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  const auth = {
    updateUser: vi.fn(async () => ({ error: options.updateError ?? null })),
    getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-access-token' } } })),
  }
  const client = vi.fn(options.client ?? (async () => ({ auth })))
  const activate = vi.fn(options.activate ?? (async () => ({})))
  const navigate = vi.fn(async () => {})
  const setup = new Function('ref', 'definePageMeta', 'useSupabaseClient', '$fetch', 'navigateTo',
    `${compiled}\nreturn { password, confirmation, message, saving, submit };`)
  const form = setup(<T>(value: T) => ({ value }), () => {}, client, activate, navigate) as {
    password: { value: string }
    confirmation: { value: string }
    message: { value: string }
    saving: { value: boolean }
    submit: () => Promise<void>
  }
  form.password.value = 'a-valid-password'
  form.confirmation.value = 'a-valid-password'
  return { form, auth, client, activate, navigate }
}

describe('portal activation recovery', () => {
  it('reenables the form after a deferred SDK failure and allows retry', async () => {
    const pendingClient = vi.fn().mockRejectedValueOnce(new Error('Chunk load failed'))
    const state = activationForm({ client: pendingClient })
    pendingClient.mockResolvedValueOnce({ auth: state.auth })

    await state.form.submit()
    expect(state.form.saving.value).toBe(false)
    expect(state.form.message.value).toContain('Vérifiez votre connexion puis réessayez')
    expect(state.auth.updateUser).not.toHaveBeenCalled()
    expect(state.activate).not.toHaveBeenCalled()

    await state.form.submit()
    expect(state.form.message.value).toBe('')
    expect(state.form.saving.value).toBe(false)
    expect(state.navigate).toHaveBeenCalledWith('/portal')
  })

  it('preserves the expired invitation message and avoids activation', async () => {
    const state = activationForm({ updateError: new Error('Expired invitation') })
    await state.form.submit()

    expect(state.form.saving.value).toBe(false)
    expect(state.form.message.value).toBe('Le lien est invalide ou expiré. Demandez une nouvelle invitation.')
    expect(state.activate).not.toHaveBeenCalled()
    expect(state.navigate).not.toHaveBeenCalled()
  })

  it('explains activation failures after the password has been saved', async () => {
    const state = activationForm({ activate: async () => { throw new Error('Activation unavailable') } })
    await state.form.submit()

    expect(state.form.saving.value).toBe(false)
    expect(state.form.message.value).toBe('Le mot de passe est enregistré, mais l’espace n’a pas pu être activé. Contactez Antoine.')
    expect(state.navigate).not.toHaveBeenCalled()
  })

  it('activates with the restored session and navigates to the portal', async () => {
    const state = activationForm()
    await state.form.submit()

    expect(state.auth.updateUser).toHaveBeenCalledWith({ password: 'a-valid-password' })
    expect(state.activate).toHaveBeenCalledWith('/api/portal/activate', {
      method: 'POST', headers: { Authorization: 'Bearer test-access-token' },
    })
    expect(state.navigate).toHaveBeenCalledWith('/portal')
    expect(state.form.saving.value).toBe(false)
    expect(state.form.message.value).toBe('')
  })
})
