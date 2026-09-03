import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('localized project descriptions', () => {
  it('adds nullable English and German columns through an append-only migration', async () => {
    const migration = await readFile('supabase/migrations/20260903170153_add_project_localized_descriptions.sql', 'utf8')

    expect(migration).toContain('alter table public.projects')
    expect(migration).toContain('add column if not exists description_en text')
    expect(migration).toContain('add column if not exists description_de text')
    expect(migration).not.toMatch(/drop\s+(table|column)/i)
  })

  it('exposes localized descriptions in the CRM and uses French as the public fallback', async () => {
    const [form, carousel] = await Promise.all([
      readFile('app/pages/admin/projects/index.vue', 'utf8'),
      readFile('app/components/sections/ProjectHelixCarousel.vue', 'utf8'),
    ])

    expect(form).toContain('v-model="form.descriptionEn"')
    expect(form).toContain('v-model="form.descriptionDe"')
    expect(form).toContain('v-model="form.liveUrl" type="url"')
    expect(form).toContain('autocomplete="url" required')
    expect(carousel).toContain("locale.value === 'en' && project.descriptionEn?.trim()")
    expect(carousel).toContain("locale.value === 'de' && project.descriptionDe?.trim()")
    expect(carousel).toContain('return project.description')
    expect(carousel).toContain(':lang="descriptionLanguage(project)"')
  })

  it('keeps every portfolio label translated in the active locale catalogs', async () => {
    const catalogs = await Promise.all(['fr', 'en', 'de'].map(locale =>
      readFile(`i18n/locales/${locale}.json`, 'utf8').then(JSON.parse),
    ))

    for (const catalog of catalogs) {
      expect(catalog.portfolio.technologies).toBeTruthy()
      expect(catalog.portfolio.verifiable_links).toBeTruthy()
      expect(catalog.portfolio.live_available).toBeTruthy()
      expect(catalog.portfolio.source_available).toBeTruthy()
    }
  })
})
