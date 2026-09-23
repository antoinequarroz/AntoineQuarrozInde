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

  it('captures only bounded public error metadata', () => {
    const source = read('app/plugins/posthog-public.client.ts')
    expect(source).toContain("posthog?.capture('public_app_error'")
    expect(source).toContain('capturedErrors >= 5')
    expect(source).toContain("error_name: errorName")
    expect(source).not.toContain('error_message')
    expect(source).not.toContain('error_stack')
  })
})
