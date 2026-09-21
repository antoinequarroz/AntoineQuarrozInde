const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type NewsletterLocale = 'fr' | 'en' | 'de'

export class NewsletterSubscriptionError extends Error {
  constructor(public readonly code: 'invalid_email' | 'invalid_consent' | 'invalid_source' | 'honeypot') {
    super(code)
  }
}

export function normalizeNewsletterSubscription(body: Record<string, unknown>) {
  const email = String(body.email || '').trim().toLowerCase()
  const sourcePath = String(body.sourcePath || '').trim()
  const locale: NewsletterLocale = body.locale === 'en' || body.locale === 'de' ? body.locale : 'fr'

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new NewsletterSubscriptionError('invalid_email')
  }
  if (body.consent !== true) throw new NewsletterSubscriptionError('invalid_consent')
  if (!sourcePath.startsWith('/blog/') || sourcePath.length > 500 || /[?#]/.test(sourcePath)) {
    throw new NewsletterSubscriptionError('invalid_source')
  }
  if (body.website && String(body.website).trim()) {
    throw new NewsletterSubscriptionError('honeypot')
  }

  return { email, locale, sourcePath }
}
