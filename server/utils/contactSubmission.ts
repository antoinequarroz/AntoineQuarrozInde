import { createHash } from 'node:crypto'

export const CONTACT_BUDGETS = ['<2k', '2k-5k', '5k-10k', '10k+'] as const
export const CONTACT_TIMELINES = ['urgent', '1mois', '2-3mois', 'flexible'] as const
export type ContactBudget = typeof CONTACT_BUDGETS[number]
export type ContactTimeline = typeof CONTACT_TIMELINES[number]
export type ContactLocale = 'fr' | 'en' | 'de'

const MAX_NAME_LENGTH = 120
const MAX_SUBJECT_LENGTH = 180
const MAX_MESSAGE_LENGTH = 10_000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const copy = {
  fr: { defaultSubject: 'Nouveau projet', title: 'Nouveau message depuis le portfolio', from: 'De', email: 'E-mail', subject: 'Sujet', budget: 'Budget indicatif', timeline: 'Délai cible', absent: 'Non précisé' },
  en: { defaultSubject: 'New project', title: 'New message from the portfolio', from: 'From', email: 'Email', subject: 'Subject', budget: 'Estimated budget', timeline: 'Target timeline', absent: 'Not specified' },
  de: { defaultSubject: 'Neues Projekt', title: 'Neue Nachricht aus dem Portfolio', from: 'Von', email: 'E-Mail', subject: 'Betreff', budget: 'Budgetrahmen', timeline: 'Gewünschter Zeitrahmen', absent: 'Nicht angegeben' },
} as const

export class ContactSubmissionError extends Error {
  constructor(public readonly code: 'invalid_submission' | 'invalid_name' | 'invalid_email' | 'invalid_subject' | 'invalid_message' | 'invalid_budget' | 'invalid_timeline' | 'honeypot') {
    super(code)
  }
}

function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], code: 'invalid_budget' | 'invalid_timeline'): T | null {
  if (value == null || String(value).trim() === '') return null
  const normalized = String(value).trim()
  if (!allowed.includes(normalized as T)) throw new ContactSubmissionError(code)
  return normalized as T
}

export function normalizeContactSubmission(body: Record<string, unknown>) {
  const submissionId = String(body.submissionId || '').trim().toLowerCase()
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const subjectInput = String(body.subject || '').trim()
  const message = String(body.message || '').trim()
  const locale: ContactLocale = body.locale === 'en' || body.locale === 'de' ? body.locale : 'fr'

  if (!UUID_PATTERN.test(submissionId)) throw new ContactSubmissionError('invalid_submission')
  if (!name || name.length > MAX_NAME_LENGTH) throw new ContactSubmissionError('invalid_name')
  if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new ContactSubmissionError('invalid_email')
  if (subjectInput.length > MAX_SUBJECT_LENGTH) throw new ContactSubmissionError('invalid_subject')
  if (!message || message.length > MAX_MESSAGE_LENGTH) throw new ContactSubmissionError('invalid_message')
  if (body.website && String(body.website).trim()) throw new ContactSubmissionError('honeypot')

  return {
    submissionId,
    name,
    email,
    subject: subjectInput || copy[locale].defaultSubject,
    message,
    budget: optionalEnum(body.budget, CONTACT_BUDGETS, 'invalid_budget'),
    timeline: optionalEnum(body.timeline, CONTACT_TIMELINES, 'invalid_timeline'),
    locale,
  }
}

export function contactPayloadFingerprint(input: ReturnType<typeof normalizeContactSubmission>) {
  return createHash('sha256').update(JSON.stringify({
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    budget: input.budget,
    timeline: input.timeline,
    locale: input.locale,
  })).digest('hex')
}

export function isValidMailbox(value: unknown) {
  const normalized = String(value || '').trim()
  return normalized.length <= 320 && EMAIL_PATTERN.test(normalized)
}

export function escapeContactHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildContactNotification(input: ReturnType<typeof normalizeContactSubmission>) {
  const labels = copy[input.locale]
  const safeName = escapeContactHtml(input.name)
  const safeEmail = escapeContactHtml(input.email)
  const safeSubject = escapeContactHtml(input.subject)
  const safeMessage = escapeContactHtml(input.message)
  const safeBudget = escapeContactHtml(input.budget || labels.absent)
  const safeTimeline = escapeContactHtml(input.timeline || labels.absent)
  const subject = `[Portfolio] ${input.subject}`
  const text = `${labels.title}\n\n${labels.from}: ${input.name}\n${labels.email}: ${input.email}\n${labels.subject}: ${input.subject}\n${labels.budget}: ${input.budget || labels.absent}\n${labels.timeline}: ${input.timeline || labels.absent}\n\n${input.message}`
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.6"><h2 style="color:#7c3aed">${labels.title}</h2><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px 0;color:#6b7280;width:130px">${labels.from}</td><td style="padding:8px 0;font-weight:600">${safeName}</td></tr><tr><td style="padding:8px 0;color:#6b7280">${labels.email}</td><td style="padding:8px 0"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr><tr><td style="padding:8px 0;color:#6b7280">${labels.subject}</td><td style="padding:8px 0">${safeSubject}</td></tr><tr><td style="padding:8px 0;color:#6b7280">${labels.budget}</td><td style="padding:8px 0">${safeBudget}</td></tr><tr><td style="padding:8px 0;color:#6b7280">${labels.timeline}</td><td style="padding:8px 0">${safeTimeline}</td></tr></table><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"><p style="color:#374151;line-height:1.6;white-space:pre-wrap">${safeMessage}</p></div>`
  return { subject, text, html }
}
