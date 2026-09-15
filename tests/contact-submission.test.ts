import { describe, expect, it } from 'vitest'
import { buildContactNotification, ContactSubmissionError, contactPayloadFingerprint, isValidMailbox, normalizeContactSubmission } from '../server/utils/contactSubmission'

const minimal = {
  submissionId: '3a165d6c-2d56-4fa8-a4ee-10ee30e5f0a1',
  name: 'Ada Lovelace',
  email: 'ADA@example.com',
  message: 'Je souhaite vous parler de mon projet.',
  website: '',
}

describe('contact submission contract', () => {
  it('accepts a minimal request and keeps project details absent', () => {
    expect(normalizeContactSubmission(minimal)).toMatchObject({
      email: 'ada@example.com', subject: 'Nouveau projet', budget: null, timeline: null, locale: 'fr',
    })
  })

  it('accepts only the closed optional values and localizes the default subject', () => {
    expect(normalizeContactSubmission({ ...minimal, locale: 'en', budget: '2k-5k', timeline: 'flexible' }))
      .toMatchObject({ subject: 'New project', budget: '2k-5k', timeline: 'flexible', locale: 'en' })
    expect(() => normalizeContactSubmission({ ...minimal, budget: 'unlimited' })).toThrow(ContactSubmissionError)
    expect(() => normalizeContactSubmission({ ...minimal, timeline: 'tomorrow' })).toThrow(ContactSubmissionError)
  })

  it('rejects an invalid id, identity, empty message and honeypot', () => {
    expect(() => normalizeContactSubmission({ ...minimal, submissionId: 'not-a-uuid' })).toThrow('invalid_submission')
    expect(() => normalizeContactSubmission({ ...minimal, name: '' })).toThrow('invalid_name')
    expect(() => normalizeContactSubmission({ ...minimal, email: 'invalid' })).toThrow('invalid_email')
    expect(() => normalizeContactSubmission({ ...minimal, message: ' ' })).toThrow('invalid_message')
    expect(() => normalizeContactSubmission({ ...minimal, website: 'spam.example' })).toThrow('honeypot')
  })

  it('builds an escaped notification without fake optional values', () => {
    const normalized = normalizeContactSubmission({ ...minimal, name: '<Ada>', message: '<script>alert(1)</script>' })
    const notification = buildContactNotification(normalized)
    expect(notification.html).toContain('&lt;Ada&gt;')
    expect(notification.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(notification.text).toContain('Non précisé')
    expect(notification.html).not.toContain('<script>')
  })

  it('produces a stable fingerprint and validates configured mailboxes', () => {
    const normalized = normalizeContactSubmission(minimal)
    expect(contactPayloadFingerprint(normalized)).toBe(contactPayloadFingerprint({ ...normalized }))
    expect(contactPayloadFingerprint({ ...normalized, message: 'Autre' })).not.toBe(contactPayloadFingerprint(normalized))
    expect(isValidMailbox('info@antoinequarroz.ch')).toBe(true)
    expect(isValidMailbox('')).toBe(false)
  })
})
