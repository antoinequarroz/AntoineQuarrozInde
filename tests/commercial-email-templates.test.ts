import { describe, expect, it } from 'vitest'
import { buildCommercialEmail, normalizeCommercialLocale } from '../server/utils/commercialEmailTemplates'

describe('commercial email templates', () => {
  const templates = ['quote_available', 'invoice_available', 'payment_received', 'quote_reminder', 'invoice_reminder'] as const

  it.each(['fr', 'en', 'de'] as const)('builds every commercial template in %s', (locale) => {
    for (const template of templates) {
      const message = buildCommercialEmail({ template, locale, recipientName: 'Ada', documentNumber: 'DOC-42', portalUrl: 'https://example.test/portal', amountLabel: '42 CHF' })
      expect(message.locale).toBe(locale)
      expect(message.subject).toContain('DOC-42')
      expect(message.text).toContain('https://example.test/portal')
      expect(message.html).toContain('https://example.test/portal')
    }
  })

  it('falls back explicitly to French and escapes untrusted display values', () => {
    expect(normalizeCommercialLocale('it')).toBe('fr')
    const message = buildCommercialEmail({ template: 'quote_available', locale: 'it', recipientName: '<script>alert(1)</script>', documentNumber: '<DEV>', portalUrl: 'https://example.test/?x="bad"' })
    expect(message.locale).toBe('fr')
    expect(message.text).toContain('<script>')
    expect(message.html).not.toContain('<script>')
    expect(message.html).toContain('&lt;script&gt;')
    expect(message.html).toContain('&quot;bad&quot;')
  })
})
