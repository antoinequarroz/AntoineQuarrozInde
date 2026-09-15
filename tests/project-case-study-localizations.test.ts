import { readFile } from 'node:fs/promises'
import { beforeAll, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubGlobal('createError', (input: { statusCode: number, message: string, data?: unknown }) =>
    Object.assign(new Error(input.message), input),
  )
})

const baseProject = {
  title: 'Application multilingue',
  slug: 'application-multilingue',
  category: 'mobile',
  description: 'Description courte en français.',
  image: 'https://example.com/cover.jpg',
}

describe('AQ-PROJ-002 — localized case-study drafts', () => {
  it('recognizes only the expected pre-migration relation error for the admin rollout fallback', async () => {
    const { isMissingProjectLocalizationSchema } = await import('../server/utils/publicContent')

    expect(isMissingProjectLocalizationSchema({
      code: 'PGRST200',
      message: "Could not find a relationship involving project_case_study_localizations",
    })).toBe(true)
    expect(isMissingProjectLocalizationSchema({ code: 'PGRST200', message: 'another relation' })).toBe(false)
    expect(isMissingProjectLocalizationSchema({ code: '42501', message: 'project_case_study_localizations denied' })).toBe(false)
  })

  it('normalizes FR, EN and DE independently without copying French into an empty locale', async () => {
    const { projectPayload } = await import('../server/utils/projectPayload')
    const payload = projectPayload({
      ...baseProject,
      caseStudyLocalizations: {
        fr: {
          projectRole: 'Conception et développement',
          challenge: 'Contexte français',
          deliverables: ['Application iOS'],
          results: [{ value: '+25 %', label: 'Conversion', approved: true }],
        },
        en: {
          projectRole: 'Product design and development',
          challenge: 'English context',
          deliverables: ['iOS application'],
          results: [{ value: '+25%', label: 'Conversion', approved: false }],
        },
        de: {},
      },
    }, 'org-test')

    expect(payload.case_study_localizations).toEqual({
      fr: expect.objectContaining({
        project_role: 'Conception et développement',
        challenge: 'Contexte français',
        deliverables: ['Application iOS'],
      }),
      en: expect.objectContaining({
        project_role: 'Product design and development',
        challenge: 'English context',
        deliverables: ['iOS application'],
      }),
      de: {
        project_role: null,
        project_duration: null,
        challenge: null,
        project_scope: null,
        key_decisions: null,
        approach: null,
        solution: null,
        outcome: null,
        deliverables: [],
        results: [],
      },
    })
    expect(payload.case_study_localizations.en.results[0]).toMatchObject({
      value: '+25%',
      label: 'Conversion',
      approved: false,
    })
    expect(payload.case_study_localizations.de.challenge).not.toBe('Contexte français')
  })

  it.each([
    ['fr', 'challenge', 'x'.repeat(4001)],
    ['en', 'projectRole', 'x'.repeat(181)],
    ['de', 'outcome', 'x'.repeat(4001)],
  ] as const)('targets an invalid %s field precisely', async (locale, field, value) => {
    const { projectPayload } = await import('../server/utils/projectPayload')

    try {
      projectPayload({
        ...baseProject,
        caseStudyLocalizations: {
          fr: {},
          en: {},
          de: {},
          [locale]: { [field]: value },
        },
      }, 'org-test')
      throw new Error('Expected localized validation to fail')
    }
    catch (error) {
      expect(error).toMatchObject({
        statusCode: 400,
        data: { locale, field },
      })
    }
  })

  it('rejects unknown locales and reports result indexes without mutating sibling languages', async () => {
    const { projectPayload } = await import('../server/utils/projectPayload')
    const localizations = {
      fr: { challenge: 'FR conservé' },
      en: { challenge: 'EN conservé', results: [{ value: '', label: 'Missing value' }] },
      de: { challenge: 'DE conservé' },
    }

    expect(() => projectPayload({
      ...baseProject,
      caseStudyLocalizations: { ...localizations, it: {} },
    }, 'org-test')).toThrow('Unsupported case-study locale: it')

    try {
      projectPayload({ ...baseProject, caseStudyLocalizations: localizations }, 'org-test')
      throw new Error('Expected the incomplete English result to fail')
    }
    catch (error) {
      expect(error).toMatchObject({
        data: { locale: 'en', field: 'results.0.value' },
      })
      expect(localizations.fr.challenge).toBe('FR conservé')
      expect(localizations.de.challenge).toBe('DE conservé')
    }
  })

  it('keeps drafts private and wires accessible language tabs into the admin form', async () => {
    const [migration, schema, publicContent, projectsApi, form, fields] = await Promise.all([
      readFile('supabase/migrations/20260915143147_add_project_case_study_localizations.sql', 'utf8'),
      readFile('supabase/schema.sql', 'utf8'),
      readFile('server/utils/publicContent.ts', 'utf8'),
      readFile('server/api/projects.get.ts', 'utf8'),
      readFile('app/pages/admin/projects/index.vue', 'utf8'),
      readFile('app/components/admin/ProjectCaseStudyFields.vue', 'utf8'),
    ])

    expect(migration).toContain('create table if not exists public.project_case_study_localizations')
    expect(migration).toContain('alter table public.project_case_study_localizations enable row level security')
    expect(migration).toContain('revoke all on table public.project_case_study_localizations from public, anon, authenticated')
    expect(migration).toContain('security invoker')
    expect(migration).toContain("'project.case_study_localizations_changed'")
    expect(migration).not.toMatch(/drop\s+(table|column)/i)
    expect(schema).toContain('create table if not exists public.project_case_study_localizations')
    const publicProjectColumns = publicContent.match(/export const PUBLIC_PROJECT_COLUMNS = \[([\s\S]*?)\]\.join/)?.[1]
    expect(publicProjectColumns).toBeTruthy()
    expect(publicProjectColumns).not.toContain('project_case_study_localizations')
    expect(projectsApi).toContain("publicView ? PUBLIC_PROJECT_COLUMNS : '*, project_case_study_localizations(*)'")
    expect(projectsApi).toContain('isMissingProjectLocalizationSchema(error)')
    expect(form).toContain('caseStudyLocalizations: emptyProjectCaseStudyLocalizations()')
    expect(fields).toContain('role="tablist"')
    expect(fields).toContain('role="tab"')
    expect(fields).toContain('role="tabpanel"')
    expect(fields).toContain('@keydown="handleLocaleKeydown($event, localeOption)"')
    expect(fields).toContain(':lang="activeLocale"')
  })
})
