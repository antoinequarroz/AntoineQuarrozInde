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

  it('keeps secondary landing actions comfortable to tap', async () => {
    const [footer, blog, contact, styles] = await Promise.all([
      readFile('app/components/layout/AppFooter.vue', 'utf8'),
      readFile('app/components/sections/BlogSection.vue', 'utf8'),
      readFile('app/components/sections/ContactSection.vue', 'utf8'),
      readFile('app/assets/css/main.css', 'utf8'),
    ])

    expect(footer).toContain('flex h-11 w-11 items-center')
    expect(footer).toContain('inline-flex min-h-11 min-w-11 items-center text-sm')
    expect(await readFile('app/components/ui/BookingCalendar.vue', 'utf8')).toContain('flex min-h-11 items-center justify-center')
    expect(blog).toContain('btn-secondary mt-5 min-h-11')
    expect(contact).toContain('inline-flex min-h-11 items-center text-violet-600')
    expect(styles).toContain(':where(a, button, input, select, textarea, summary, [role="button"])')
    expect(styles).toContain('transition-duration: 120ms !important')
  })
})
