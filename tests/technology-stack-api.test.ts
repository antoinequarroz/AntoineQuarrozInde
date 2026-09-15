import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import {
  cloneDefaultTechnologyStack,
  parseTechnologyStackItems,
  TechnologyStackValidationError,
  technologyStackOrDefault,
} from '../shared/utils/technologyStack'
import {
  parseExpectedRevision,
  requireTechnologyStackEditor,
  serializeTechnologyStackSettings,
} from '../server/utils/technologyStack'

describe('technology stack API boundaries', () => {
  beforeEach(() => {
    vi.stubGlobal('createError', (input: object) => Object.assign(new Error('request failed'), input))
  })

  it.each(['manager', 'viewer', 'client', null])('rejects the %s role from editorial writes', (role) => {
    expect(() => requireTechnologyStackEditor({ role })).toThrowError(expect.objectContaining({ statusCode: 403 }))
  })

  it.each(['owner', 'admin'])('allows the %s role to edit', (role) => {
    expect(() => requireTechnologyStackEditor({ role })).not.toThrow()
  })

  it('requires a non-negative integer revision', () => {
    expect(parseExpectedRevision(0)).toBe(0)
    expect(parseExpectedRevision(4)).toBe(4)
    expect(() => parseExpectedRevision(-1)).toThrowError(expect.objectContaining({ statusCode: 400 }))
    expect(() => parseExpectedRevision('4')).toThrowError(expect.objectContaining({ statusCode: 400 }))
  })

  it('returns isolated fresh defaults before a tenant saves settings', () => {
    const first = serializeTechnologyStackSettings(null)
    const second = serializeTechnologyStackSettings(null)
    first.draftItems[0]!.label = 'Mutated'
    expect(second.draftItems[0]?.label).toBe('Vue 3')
    expect(second).toMatchObject({ draftRevision: 0, publishedRevision: 0, updatedAt: null, publishedAt: null })
  })

  it('never serializes an invalid stored draft as editable data', () => {
    expect(() => serializeTechnologyStackSettings({
      draft_items: [{ unsafe: true }],
      published_items: cloneDefaultTechnologyStack(),
      draft_revision: 2,
      published_revision: 1,
      updated_at: '2026-09-15T20:00:00Z',
      published_at: '2026-09-15T19:00:00Z',
    })).toThrow(TechnologyStackValidationError)
  })

  it('keeps public fallback independent from private parsing failures', () => {
    expect(technologyStackOrDefault([{ unsafe: true }])).toEqual(cloneDefaultTechnologyStack())
    expect(() => parseTechnologyStackItems([{ unsafe: true }])).toThrow()
  })

  it('scopes every private mutation to the authenticated organization and exact revision', async () => {
    const [saveRoute, publishRoute] = await Promise.all([
      readFile('server/api/admin/technology-stack.put.ts', 'utf8'),
      readFile('server/api/admin/technology-stack/publish.post.ts', 'utf8'),
    ])

    expect(saveRoute).toContain(".eq('organization_id', org.id)")
    expect(saveRoute).toContain(".eq('draft_revision', expectedRevision)")
    expect(saveRoute).not.toContain('body?.organization')
    expect(publishRoute).toContain(".eq('organization_id', org.id)")
    expect(publishRoute).toContain(".eq('draft_revision', expectedDraftRevision)")
    expect(publishRoute).toContain(".eq('published_revision', expectedPublishedRevision)")
    expect(publishRoute).not.toContain('body?.organization')
  })

  it('returns only the published document from the public route', async () => {
    const publicRoute = await readFile('server/api/public/technology-stack.get.ts', 'utf8')
    expect(publicRoute).toContain(".select('published_items')")
    expect(publicRoute).not.toContain('draft_items')
    expect(publicRoute).toContain('resolveCanonicalPublicOrganizationId()')
    expect(publicRoute).toContain('serializePublicTechnologyStack(null)')
  })

  it('keeps audit payloads synthetic instead of recording stack contents', async () => {
    const [saveRoute, publishRoute] = await Promise.all([
      readFile('server/api/admin/technology-stack.put.ts', 'utf8'),
      readFile('server/api/admin/technology-stack/publish.post.ts', 'utf8'),
    ])
    expect(saveRoute).toContain('payload: { revision: result.data.draft_revision, itemCount: items.length }')
    expect(publishRoute).toContain('itemCount: draftItems.length')
    expect(saveRoute).not.toContain('payload: { items')
    expect(publishRoute).not.toContain('payload: { items')
  })
})
