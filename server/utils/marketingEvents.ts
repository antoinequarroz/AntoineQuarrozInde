export const MARKETING_EVENTS = [
  'hero_view',
  'hero_cta_primary_click',
  'hero_cta_secondary_click',
  'services_cta_click',
  'contact_email_click',
  'booking_calendar_click',
  'booking_fallback_click',
  'project_case_study_view',
  'project_case_study_click',
  'project_live_click',
  'project_code_click',
  'contact_form_submit_success',
  'contact_form_submit_error',
] as const

export type MarketingEvent = typeof MARKETING_EVENTS[number]

const allowedMarketingEvents = new Set<string>(MARKETING_EVENTS)

export function isAllowedMarketingEvent(value: unknown): value is MarketingEvent {
  return typeof value === 'string' && allowedMarketingEvents.has(value)
}
