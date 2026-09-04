import { readFile } from 'node:fs/promises'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubGlobal('createError', (input: { statusCode: number, message: string }) => Object.assign(new Error(input.message), input))
})

describe('article editorial publication', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('adds stable editorial dates with an append-only historical backfill', async () => {
    const [migration, schema] = await Promise.all([
      readFile('supabase/migrations/20260903232000_add_editorial_timestamps_article_audit.sql', 'utf8'),
      readFile('supabase/schema.sql', 'utf8'),
    ])

    expect(migration).toContain('add column if not exists published_at timestamptz')
    expect(migration).toContain('add column if not exists case_study_published_at timestamptz')
    expect(migration).toContain('set updated_at = coalesce(updated_at, created_at)')
    expect(migration).toContain('when published then coalesce(published_at, created_at)')
    expect(migration).toContain('when case_study_published then coalesce(case_study_published_at, created_at)')
    expect(migration).toContain('maintain_article_editorial_timestamps')
    expect(migration).toContain('maintain_project_editorial_timestamps')
    expect(migration).not.toMatch(/drop\s+(table|column)/i)
    expect(schema).toContain('published_at timestamptz')
    expect(schema).toContain('case_study_published_at timestamptz')
  })

  it('maps the article form payload without allowing ambiguous publication values', async () => {
    const { articlePayload } = await import('../server/utils/articlePayload')
    const payload = articlePayload({
      title: 'Article',
      slug: 'article',
      excerpt: 'Résumé',
      content: 'Contenu',
      published: false,
      tags: ['seo'],
      readTime: 7,
    })

    expect(payload).toEqual({
      title: 'Article',
      slug: 'article',
      excerpt: 'Résumé',
      content: 'Contenu',
      cover_image: null,
      published: false,
      tags: ['seo'],
      read_time: 7,
    })
    expect(() => articlePayload({ published: 'false' })).toThrow('published must be a boolean')
  })

  it('creates an article through the atomic audited operation', async () => {
    const body = { title: 'Article', published: true }
    const payload = { title: 'Article', published: true }
    const rpc = vi.fn().mockResolvedValue({ data: { id: 42 }, error: null })

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('requireAdmin', vi.fn().mockResolvedValue({ org: { id: 'org-test', role: 'owner' }, user: { id: 'user-test' } }))
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body))
    vi.stubGlobal('getSupabaseAdmin', () => ({ rpc }))
    vi.stubGlobal('articlePayload', vi.fn(() => payload))
    vi.stubGlobal('articlePublicationRpcError', vi.fn())

    const { default: handler } = await import('../server/api/articles.post')
    await expect(handler({} as never)).resolves.toEqual({ id: 42 })
    expect(rpc).toHaveBeenCalledWith('save_article_with_publication_audit', {
      p_organization_id: 'org-test',
      p_article_id: null,
      p_actor_user_id: 'user-test',
      p_actor_role: 'owner',
      p_payload: payload,
    })
  })

  it('updates an article through the same organization-scoped atomic operation', async () => {
    const payload = { title: 'Article modifié', published: false }
    const rpc = vi.fn().mockResolvedValue({ data: { id: 12 }, error: null })

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('requireAdmin', vi.fn().mockResolvedValue({ org: { id: 'org-test', role: 'admin' }, user: { id: 'user-test' } }))
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ id: 12 }))
    vi.stubGlobal('getSupabaseAdmin', () => ({ rpc }))
    vi.stubGlobal('articlePayload', vi.fn(() => payload))
    vi.stubGlobal('articlePublicationRpcError', vi.fn())

    const { default: handler } = await import('../server/api/articles.put')
    await expect(handler({} as never)).resolves.toEqual({ id: 12 })
    expect(rpc).toHaveBeenCalledWith('save_article_with_publication_audit', {
      p_organization_id: 'org-test',
      p_article_id: 12,
      p_actor_user_id: 'user-test',
      p_actor_role: 'admin',
      p_payload: payload,
    })
  })

  it('maps authorization and tenant misses without changing the API contract', async () => {
    const { articlePublicationRpcError } = await import('../server/utils/articlePublication')

    expect(articlePublicationRpcError({ code: '42501', message: 'article_publication_forbidden' }))
      .toMatchObject({ statusCode: 403 })
    expect(articlePublicationRpcError({ code: 'P0002', message: 'article_not_found' }))
      .toMatchObject({ statusCode: 404 })
  })

  it('logs unexpected database errors without exposing their details to clients', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { articlePublicationRpcError } = await import('../server/utils/articlePublication')

    const error = articlePublicationRpcError({
      code: 'XX000',
      message: 'secret database host and internal constraint details',
    })

    expect(error).toMatchObject({ statusCode: 500, message: 'Unable to save article' })
    expect(error.message).not.toContain('secret database host')
    expect(consoleError).toHaveBeenCalledWith(
      '[articles] Atomic save failed',
      expect.objectContaining({ code: 'XX000' }),
    )
    consoleError.mockRestore()
  })
})
