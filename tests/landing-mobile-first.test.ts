import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

describe('landing page mobile-first refinements', () => {
  it('provides the new decision copy in every public locale', async () => {
    const catalogs = await Promise.all(
      ['fr', 'en', 'de'].map(async locale => JSON.parse(await readFile(`i18n/locales/${locale}.json`, 'utf8'))),
    )

    for (const catalog of catalogs) {
      expect(catalog.nav.skip_to_content).toBeTruthy()
      expect(catalog.services.choice_help).toBeTruthy()
      expect(catalog.services.choose).toBeTruthy()
      expect(catalog.services.vitrine.best_for).toBeTruthy()
      expect(catalog.services.cms.best_for).toBeTruthy()
      expect(catalog.services.mobile.best_for).toBeTruthy()
      expect(catalog.contact.form.selected_service).toBeTruthy()
      expect(catalog.contact.form.captcha_error).toBeTruthy()
    }
  })
})
