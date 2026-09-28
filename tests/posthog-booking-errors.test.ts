import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('PostHog booking and public error signals', () => {
  it('counts a confirmed Cal.com booking without forwarding booking details', () => {
    const source = read('app/components/ui/BookingCalendar.vue')
    expect(source).toContain("event.data?.type !== 'bookingSuccessfulV2'")
    expect(source).toContain("trackPostHog('booking_confirmed', { provider: 'cal.com' })")
    expect(source).toContain("['https://cal.com', 'https://app.cal.com'].includes(event.origin)")
    expect(source).not.toContain('event.data.booking')
  })

  it('captures native exceptions only on public production pages', () => {
    const source = read('app/plugins/posthog-public.client.ts')
    expect(source).toContain('capture_exceptions: true')
    expect(source).toContain("event.event === '$exception' && !isPostHogPublicPath(window.location.pathname)")
    expect(source).toContain('posthog?.captureException(error)')
    expect(source).not.toContain("window.addEventListener('error'")
    expect(source).not.toContain("window.addEventListener('unhandledrejection'")
  })
})
