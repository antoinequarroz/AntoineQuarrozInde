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
      expect(catalog.contact.form.open_cta).toBeTruthy()
      expect(catalog.contact.form.details_show).toBeTruthy()
      expect(catalog.contact.form.details_hint).toBeTruthy()
    }
  })

  it('uses an accurate heading for the broader technology set', async () => {
    const [fr, en, de] = await Promise.all(
      ['fr', 'en', 'de'].map(async locale => JSON.parse(await readFile(`i18n/locales/${locale}.json`, 'utf8'))),
    )

    expect(fr.about.tools_title).toBe('Technologies et outils')
    expect(en.about.tools_title).toBe('Technologies & tools')
    expect(de.about.tools_title).toBe('Technologien & Tools')
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
    expect(contact).toContain(':aria-expanded="detailsOpen"')
    expect(contact).toContain('aria-controls="contact-project-details"')
    expect(contact).toContain("window.addEventListener('aq:contact-open', handleContactOpen)")
    expect(contact).toContain('nameInputRef.value?.focus')
    expect(styles).toContain(':where(a, button, input, select, textarea, summary, [role="button"])')
    expect(styles).toContain('transition-duration: 120ms !important')
  })

  it('opens the public 30-minute Cal.com scheduler without exposing an API key', async () => {
    const [booking, config, envExample] = await Promise.all([
      readFile('app/components/ui/BookingCalendar.vue', 'utf8'),
      readFile('nuxt.config.ts', 'utf8'),
      readFile('.env.example', 'utf8'),
    ])

    expect(config).toContain("bookingUrl: process.env.NUXT_PUBLIC_BOOKING_URL")
    expect(config).not.toContain('NUXT_PUBLIC_CAL_LINK')
    expect(envExample).toContain('NUXT_PUBLIC_BOOKING_URL=https://cal.com/your-name/30min')
    expect(booking).toContain("script.src = 'https://app.cal.com/embed/embed.js'")
    expect(booking).toContain(':data-cal-link="bookingPath"')
    expect(booking).toContain(':data-cal-namespace="CAL_NAMESPACE"')
    expect(booking).toContain(':href="bookingUrl"')
  })

  it('shows the current public stack without the retired Tailwind label', async () => {
    const [about, footer, stackSource] = await Promise.all([
      readFile('app/components/sections/AboutSection.vue', 'utf8'),
      readFile('app/components/layout/AppFooter.vue', 'utf8'),
      readFile('shared/utils/technologyStack.ts', 'utf8'),
    ])

    for (const technology of ['React', 'Next.js', 'SwiftUI', 'Rust', 'Docker', 'Stripe', 'Cloudflare', 'Caddy']) {
      expect(stackSource).toContain(`'${technology}'`)
    }
    expect(about).toContain('usePublicTechnologyStack()')
    expect(footer).toContain('usePublicTechnologyStack()')
    expect(stackSource).not.toContain("'Tailwind CSS'")
    expect(stackSource).not.toContain("'Vue 3 / Nuxt'")
    expect(stackSource).not.toContain("'Flutter / Dart'")
    expect(stackSource).not.toContain("'Git / GitHub'")
  })

  it('renders consistent technology pictograms beside stack labels', async () => {
    const [about, footer, icon] = await Promise.all([
      readFile('app/components/sections/AboutSection.vue', 'utf8'),
      readFile('app/components/layout/AppFooter.vue', 'utf8'),
      readFile('app/components/ui/TechnologyIcon.vue', 'utf8'),
    ])

    expect(about).toContain('<UiTechnologyIcon')
    expect(footer).toContain('<UiTechnologyIcon')
    expect(icon).toContain("from 'simple-icons'")
    expect(icon).toContain('aria-hidden="true"')
  })
})
