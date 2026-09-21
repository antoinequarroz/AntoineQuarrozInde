import { describe, expect, it } from 'vitest'
import { NewsletterSubscriptionError, normalizeNewsletterSubscription } from '../server/utils/newsletterSubscription'

describe('newsletter subscription contract', () => {
  const valid = {
    email: ' Reader@Example.com ',
    consent: true,
    locale: 'fr',
    sourcePath: '/blog/remplacer-excel-outil-metier-criteres-etapes',
    website: '',
  }

  it('normalizes an explicitly consented blog subscription', () => {
    expect(normalizeNewsletterSubscription(valid)).toEqual({
      email: 'reader@example.com',
      locale: 'fr',
      sourcePath: '/blog/remplacer-excel-outil-metier-criteres-etapes',
    })
  })

  it('keeps only supported locales', () => {
    expect(normalizeNewsletterSubscription({ ...valid, locale: 'de' }).locale).toBe('de')
    expect(normalizeNewsletterSubscription({ ...valid, locale: 'it' }).locale).toBe('fr')
  })

  it.each([
    [{ ...valid, email: 'invalid' }, 'invalid_email'],
    [{ ...valid, consent: false }, 'invalid_consent'],
    [{ ...valid, sourcePath: '/admin' }, 'invalid_source'],
    [{ ...valid, sourcePath: '/blog/test?email=secret@example.com' }, 'invalid_source'],
    [{ ...valid, website: 'spam.example' }, 'honeypot'],
  ])('rejects invalid or automated submissions', (payload, code) => {
    expect(() => normalizeNewsletterSubscription(payload)).toThrowError(NewsletterSubscriptionError)
    try {
      normalizeNewsletterSubscription(payload)
    }
    catch (error) {
      expect((error as NewsletterSubscriptionError).code).toBe(code)
    }
  })
})
