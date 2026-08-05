import { describe, expect, it } from 'vitest'
import { isAllowedMarketingEvent, MARKETING_EVENTS } from '../server/utils/marketingEvents'

describe('marketing events', () => {
  it('accepts the privacy-safe conversion events used by the landing page', () => {
    expect(MARKETING_EVENTS).toContain('booking_calendar_click')
    expect(MARKETING_EVENTS).toContain('project_case_study_view')
    expect(MARKETING_EVENTS).toContain('project_live_click')
    expect(MARKETING_EVENTS.every(isAllowedMarketingEvent)).toBe(true)
  })

  it('rejects arbitrary event names', () => {
    expect(isAllowedMarketingEvent('user_email_captured')).toBe(false)
    expect(isAllowedMarketingEvent('')).toBe(false)
    expect(isAllowedMarketingEvent(null)).toBe(false)
  })
})
