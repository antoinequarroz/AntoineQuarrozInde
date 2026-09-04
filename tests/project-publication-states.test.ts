import { readFile } from 'node:fs/promises'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubGlobal('createError', (input: { statusCode: number, message: string }) => Object.assign(new Error(input.message), input))
})

describe('project publication states', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('adds a private-by-default portfolio state without hiding existing projects', async () => {
    const [compatibilityMigration, activationMigration, caseStudyActivationMigration, schema] = await Promise.all([
      readFile('supabase/migrations/20260903193214_add_project_portfolio_visibility.sql', 'utf8'),
      readFile('supabase/migrations/20260903203219_activate_project_portfolio_visibility.sql', 'utf8'),
      readFile('supabase/migrations/20260904230738_activate_project_case_study_approvals.sql', 'utf8'),
      readFile('supabase/schema.sql', 'utf8'),
    ])

    const backfill = compatibilityMigration.indexOf('set portfolio_visible = true')
    const notNull = compatibilityMigration.indexOf('alter column portfolio_visible set not null')

    expect(compatibilityMigration).toContain('add column if not exists portfolio_visible boolean')
    expect(backfill).toBeGreaterThan(-1)
    expect(notNull).toBeGreaterThan(backfill)
    expect(compatibilityMigration).toContain('alter column portfolio_visible set default true')
    expect(activationMigration).toContain('alter column portfolio_visible set default false')
    expect(compatibilityMigration).toContain('idx_projects_portfolio_visible')
    expect(`${compatibilityMigration}\n${activationMigration}`).not.toMatch(/drop\s+(table|column)/i)
    expect(schema).toContain('portfolio_visible boolean not null default false')
    expect(activationMigration).toContain('save_project_with_publication_audit')
    expect(activationMigration).toContain('for update')
    expect(caseStudyActivationMigration).toContain('projects_case_study_publication_matches_approval')
    expect(caseStudyActivationMigration).toContain('enforce_project_case_study_activation')
    expect(caseStudyActivationMigration).toContain('save_project_with_publication_audit_transition')
    expect(caseStudyActivationMigration).toContain('from public.organization_memberships')
    expect(caseStudyActivationMigration).not.toMatch(/security\s+definer/i)
  })

  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])('keeps portfolio=%s and case-study=%s independent', async (portfolioVisible, caseStudyPublished) => {
    const { projectPayload } = await import('../server/utils/projectPayload')
    const payload = projectPayload({
      title: 'Projet test',
      slug: `projet-${Number(portfolioVisible)}-${Number(caseStudyPublished)}`,
      category: 'web',
      description: 'Description française.',
      image: 'https://example.com/cover.jpg',
      liveUrl: 'https://example.com',
      portfolioVisible,
      caseStudyPublished,
    }, 'org-test')

    expect(payload.portfolio_visible).toBe(portfolioVisible)
    expect(payload.case_study_published).toBe(caseStudyPublished)
  })

  it('defaults both states to private and rejects ambiguous values', async () => {
    const { projectPayload } = await import('../server/utils/projectPayload')
    const base = {
      title: 'Projet test',
      slug: 'projet-test',
      category: 'web',
      description: 'Description française.',
      image: 'https://example.com/cover.jpg',
      liveUrl: 'https://example.com',
    }

    const payload = projectPayload(base, 'org-test')
    expect(payload.portfolio_visible).toBe(false)
    expect(payload.case_study_published).toBe(false)
    expect(() => projectPayload({ ...base, portfolioVisible: 'false' }, 'org-test')).toThrow('portfolioVisible must be a boolean')
    expect(() => projectPayload({ ...base, caseStudyPublished: 1 }, 'org-test')).toThrow('caseStudyPublished must be a boolean')
  })

  it('allows only owners and administrators to change a public state', async () => {
    const { assertCanChangeProjectPublication } = await import('../server/utils/projectPublication')
    const privateState = { portfolioVisible: false, caseStudyPublished: false }
    const portfolioState = { portfolioVisible: true, caseStudyPublished: false }

    expect(() => assertCanChangeProjectPublication('owner', privateState, portfolioState)).not.toThrow()
    expect(() => assertCanChangeProjectPublication('admin', privateState, portfolioState)).not.toThrow()
    expect(() => assertCanChangeProjectPublication('manager', privateState, privateState)).not.toThrow()
    expect(() => assertCanChangeProjectPublication('manager', privateState, portfolioState)).toThrow('Only an owner or administrator')
    expect(() => assertCanChangeProjectPublication('manager', null, portfolioState)).toThrow('Only an owner or administrator')
  })

  it('delegates the save, role check and audit to one atomic database operation', async () => {
    const body = { id: 12, portfolioVisible: true, caseStudyPublished: false }
    const payload = {
      organization_id: 'org-test',
      portfolio_visible: true,
      case_study_published: false,
    }
    const rpc = vi.fn().mockResolvedValue({
      data: { id: 12, ...payload },
      error: null,
    })

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('requireAdmin', vi.fn().mockResolvedValue({ org: { id: 'org-test', role: 'admin' }, user: { id: 'user-test' } }))
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body))
    vi.stubGlobal('getSupabaseAdmin', () => ({ rpc }))
    vi.stubGlobal('projectPayload', vi.fn(() => payload))
    vi.stubGlobal('projectPublicationRpcError', vi.fn())

    const { default: handler } = await import('../server/api/projects.put')
    await handler({} as never)

    expect(rpc).toHaveBeenCalledWith('save_project_with_publication_audit', {
      p_organization_id: 'org-test',
      p_project_id: 12,
      p_actor_user_id: 'user-test',
      p_actor_role: null,
      p_payload: payload,
    })
  })

  it('maps database authorization and not-found failures without leaking internals', async () => {
    const { projectPublicationRpcError } = await import('../server/utils/projectPublication')

    expect(projectPublicationRpcError({ code: '42501', message: 'project_publication_forbidden' }))
      .toMatchObject({ statusCode: 403 })
    expect(projectPublicationRpcError({ code: 'P0002', message: 'project_not_found' }))
      .toMatchObject({ statusCode: 404 })
    expect(projectPublicationRpcError({ code: '42501', message: 'project_actor_membership_required' }))
      .toMatchObject({ statusCode: 403, message: expect.stringContaining('membership') })
    expect(projectPublicationRpcError({ code: '42501', message: 'project_case_study_approver_forbidden' }))
      .toMatchObject({ statusCode: 403, message: expect.stringContaining('owner or administrator') })
  })

  it('filters the anonymous API to public portfolio cards or published studies', async () => {
    const query: Record<string, any> = {
      data: [{ id: 1, portfolio_visible: true, case_study_published: false, client_label: 'Privé', challenge: 'Secret' }],
      error: null,
    }
    query.select = vi.fn(() => query)
    query.order = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.or = vi.fn(() => query)

    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('resolveOrganizationContext', vi.fn().mockResolvedValue({ id: 'org-public', role: null }))
    vi.stubGlobal('getSupabaseAdmin', () => ({ from: vi.fn(() => query) }))

    const { default: handler } = await import('../server/api/projects.get')
    const result = await handler({} as never)

    expect(query.eq).toHaveBeenCalledWith('organization_id', 'org-public')
    expect(query.or).toHaveBeenCalledWith('portfolio_visible.eq.true,and(case_study_published.eq.true,case_study_approved_at.not.is.null)')
    expect(result[0]).toMatchObject({ client_label: null, challenge: null })
  })

  it('keeps the two controls, public gates and audit trail explicit in the implementation', async () => {
    const [form, fields, store, publicApi, updateApi, sitemap] = await Promise.all([
      readFile('app/pages/admin/projects/index.vue', 'utf8'),
      readFile('app/components/admin/ProjectCaseStudyFields.vue', 'utf8'),
      readFile('app/stores/projects.ts', 'utf8'),
      readFile('server/api/projects.get.ts', 'utf8'),
      readFile('server/api/projects.put.ts', 'utf8'),
      readFile('server/routes/sitemap.xml.ts', 'utf8'),
    ])

    expect(form).toContain('portfolioVisible: false')
    expect(form).toContain('Portfolio {{ project.portfolioVisible ? \'visible\' : \'masqué\' }}')
    expect(form).toContain("project.caseStudyPublished && project.caseStudyApprovedAt ? 'publiée' : project.caseStudyPublished ? 'à approuver' : 'brouillon'")
    expect(form).toContain('v-if="project.caseStudyPublished && project.caseStudyApprovedAt"')
    expect(fields).toContain('Afficher dans le portfolio')
    expect(fields).toContain('Publier l’étude de cas')
    expect(fields).toContain(':disabled="!canManagePublication"')
    expect(store).toContain('projects.value.filter(p => p.portfolioVisible)')
    expect(publicApi).toContain("query.or('portfolio_visible.eq.true,and(case_study_published.eq.true,case_study_approved_at.not.is.null)')")
    expect(updateApi).toContain("rpc('save_project_with_publication_audit'")
    expect(updateApi).not.toContain('logAudit(')
    expect(sitemap).toContain(".eq('case_study_published', true)")
    expect(sitemap).not.toContain(".eq('portfolio_visible', true)")
  })
})
