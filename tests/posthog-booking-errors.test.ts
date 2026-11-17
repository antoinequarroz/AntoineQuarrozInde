import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('PostHog booking and public error signals', () => {
  it('counts booking clicks towards Alfred without loading a third-party embed', () => {
    const booking = read('app/components/ui/BookingCalendar.vue')
    const plugin = read('app/plugins/posthog-public.client.ts')
    expect(booking).toContain("trackPostHog('booking_clicked', { provider: 'alfred' })")
    expect(booking).not.toContain('booking_confirmed')
    expect(plugin).toContain("host === 'alfred.postmelo.ch'")
    expect(plugin).not.toContain('cal.com')
  })

  it('captures native exceptions only on public production pages', () => {
    const source = read('app/plugins/posthog-public.client.ts')
    expect(source).toContain('capture_exceptions: true')
    expect(source).toContain("if (!isPostHogPublicPath(window.location.pathname)) return null")
    expect(source).toContain('posthog?.captureException(error)')
    expect(source).not.toContain("window.addEventListener('error'")
    expect(source).not.toContain("window.addEventListener('unhandledrejection'")
  })
})
