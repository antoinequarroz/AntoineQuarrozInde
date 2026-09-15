import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

describe('admin technology stack editor', () => {
  it('supports the complete draft and publish workflow without pointer-only controls', async () => {
    const page = await readFile('app/pages/admin/stack/index.vue', 'utf8')

    expect(page).toContain('Ajouter une technologie')
    expect(page).toContain('Enregistrer le brouillon')
    expect(page).toContain('Publier sur le site')
    expect(page).toContain('expectedDraftRevision')
    expect(page).toContain('expectedPublishedRevision')
    expect(page).toContain(':aria-label="`Monter ${item.label}`"')
    expect(page).toContain(':aria-label="`Descendre ${item.label}`"')
    expect(page).toContain(':aria-label="`Supprimer ${item.label}`"')
    expect(page).not.toContain('draggable="true"')
  })

  it('previews every locale and preserves accessible mobile controls', async () => {
    const page = await readFile('app/pages/admin/stack/index.vue', 'utf8')

    expect(page).toContain('id="stack-preview-locale"')
    expect(page).toContain('<option value="fr">FR</option>')
    expect(page).toContain('<option value="en">EN</option>')
    expect(page).toContain('<option value="de">DE</option>')
    expect(page).toContain('min-h-11')
    expect(page).toContain('min-w-11')
    expect(page).toContain('role="alert"')
    expect(page).toContain('aria-busy="true"')
  })

  it('only exposes the navigation entry to owner and admin roles', async () => {
    const layout = await readFile('app/layouts/admin.vue', 'utf8')
    expect(layout).toContain("['owner', 'admin'].includes(String(currentOrganizationRole.value))")
    expect(layout).toContain("href: '/admin/stack'")
  })
})
