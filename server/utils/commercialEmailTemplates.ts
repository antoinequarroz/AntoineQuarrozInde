export type CommercialLocale = 'fr' | 'en' | 'de'
export type CommercialTemplateKey = 'quote_available' | 'invoice_available' | 'payment_received' | 'quote_reminder' | 'invoice_reminder'

const copy = {
  fr: { hello: 'Bonjour', available: 'est maintenant disponible dans votre espace client sécurisé.', open: 'Ouvrir mon espace client', payment: 'Votre paiement a bien été enregistré.', reminder: 'Je me permets de vous rappeler ce document.', thanks: 'Merci pour votre confiance.', quote: 'Devis', invoice: 'Facture', paid: 'Paiement reçu', remind: 'Rappel' },
  en: { hello: 'Hello', available: 'is now available in your secure client portal.', open: 'Open my client portal', payment: 'Your payment has been recorded.', reminder: 'This is a friendly reminder about this document.', thanks: 'Thank you for your trust.', quote: 'Quote', invoice: 'Invoice', paid: 'Payment received', remind: 'Reminder' },
  de: { hello: 'Guten Tag', available: 'ist jetzt in Ihrem sicheren Kundenportal verfügbar.', open: 'Kundenportal öffnen', payment: 'Ihre Zahlung wurde verbucht.', reminder: 'Wir möchten Sie freundlich an dieses Dokument erinnern.', thanks: 'Vielen Dank für Ihr Vertrauen.', quote: 'Offerte', invoice: 'Rechnung', paid: 'Zahlung erhalten', remind: 'Erinnerung' },
} as const

export function normalizeCommercialLocale(value: unknown): CommercialLocale {
  return value === 'en' || value === 'de' ? value : 'fr'
}

export function formatCommercialAmount(amountCents: number, currency: string, localeValue: unknown) {
  const locale = normalizeCommercialLocale(localeValue)
  return new Intl.NumberFormat({ fr: 'fr-CH', en: 'en-CH', de: 'de-CH' }[locale], { style: 'currency', currency }).format(amountCents / 100)
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

export function buildCommercialEmail(input: {
  template: CommercialTemplateKey
  locale?: unknown
  recipientName: string
  documentNumber: string
  portalUrl: string
  amountLabel?: string
}) {
  const locale = normalizeCommercialLocale(input.locale)
  const t = copy[locale]
  const isQuote = input.template.startsWith('quote_')
  const label = isQuote ? t.quote : t.invoice
  const subject = input.template === 'payment_received'
    ? `${t.paid} — ${t.invoice} ${input.documentNumber}`
    : input.template.endsWith('_reminder') ? `${t.remind} — ${label} ${input.documentNumber}` : `${label} ${input.documentNumber}`
  const main = input.template === 'payment_received'
    ? `${t.payment}${input.amountLabel ? ` ${input.amountLabel}` : ''}`
    : input.template.endsWith('_reminder') ? `${t.reminder} ${label} ${input.documentNumber}.${input.amountLabel ? ` ${input.amountLabel}` : ''}` : `${label} ${input.documentNumber} ${t.available}`
  const text = `${t.hello} ${input.recipientName},\n\n${main}\n\n${input.portalUrl}\n\n${t.thanks}\nAntoine Quarroz`
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827;line-height:1.6"><p>${t.hello} ${escapeHtml(input.recipientName)},</p><p>${escapeHtml(main)}</p><p style="margin:28px 0"><a href="${escapeHtml(input.portalUrl)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#111827;color:#fff;text-decoration:none;font-weight:700">${t.open}</a></p><p>${t.thanks}</p><p>Antoine Quarroz</p></div>`
  return { locale, subject, text, html }
}
