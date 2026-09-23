import { beforeAll, describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'

beforeAll(() => {
  vi.stubGlobal('createError', (input: { statusCode: number, message: string }) =>
    Object.assign(new Error(input.message), input),
  )
})

describe('software project category', () => {
  it('accepts software at the server boundary and rejects unknown categories', async () => {
    const { projectPayload } = await import('../server/utils/projectPayload')
    const base = {
      title: 'Hermes Cockpit',
      slug: 'hermes-cockpit',
      description: 'Une application macOS.',
      image: 'https://example.com/hermes.jpg',
      codeUrl: 'https://github.com/example/hermes',
      portfolioVisible: true,
      caseStudyPublished: false,
    }

    expect(projectPayload({ ...base, category: 'software' }, 'org-test').category).toBe('software')
    expect(() => projectPayload({ ...base, category: 'desktop' }, 'org-test')).toThrow('Invalid project category')
  })

  it('adds the public filter and the admin option', async () => {
    const [portfolio, admin, types] = await Promise.all([
      readFile('app/components/sections/PortfolioSection.vue', 'utf8'),
      readFile('app/pages/admin/projects/index.vue', 'utf8'),
      readFile('app/types/index.ts', 'utf8'),
    ])

    expect(portfolio).toContain("project.category === 'software'")
    expect(portfolio).toContain("t('portfolio.software')")
    expect(admin).toContain('<option value="software">Logiciel</option>')
    expect(types).toContain("'web' | 'mobile' | 'cms' | 'software'")
  })

  it('keeps the software copy complete in every locale', async () => {
    for (const directory of ['i18n/locales', 'app/locales']) {
      for (const locale of ['fr', 'en', 'de']) {
        const catalog = JSON.parse(await readFile(`${directory}/${locale}.json`, 'utf8'))
        expect(catalog.portfolio.software).toBeTruthy()
        expect(catalog.portfolio.category_intro.software.title).toBeTruthy()
        expect(catalog.portfolio.category_intro.software.text).toBeTruthy()
      }
    }
  })

  it('reclassifies only Hermes Cockpit when it is still mobile', async () => {
    const migration = await readFile('supabase/migrations/20260923122050_add_software_project_category.sql', 'utf8')

    expect(migration).toContain("check (category in ('web', 'mobile', 'cms', 'software'))")
    expect(migration).toContain("where slug = 'hermes-cockpit'")
    expect(migration).toContain("and category = 'mobile'")
    expect(migration.match(/update public\.projects/g)).toHaveLength(1)
  })
})
