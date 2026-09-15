export type ReminderTarget = 'quote' | 'invoice' | 'lead'

export type ReminderPlanClient = {
  id: number
  name?: string | null
  email?: string | null
  status?: string | null
  next_follow_up_at?: string | null
  follow_up_note?: string | null
  preferred_locale?: 'fr' | 'en' | 'de' | null
}
export type ReminderPlanQuote = { id: number, number: string, title?: string | null, client_id?: number | null, valid_until?: string | null, status: string }
export type ReminderPlanInvoice = { id: number, number: string, client_id?: number | null, due_at?: string | null, status: string, reminders_paused?: boolean, balance_cents?: number, currency?: string }

export type PipelineReminderCandidate = {
  reminderKey: string
  targetType: ReminderTarget
  targetId: number
  clientId: number
  clientName: string
  email: string
  number: string
  title: string | null
  dueDate: string
  milestone: string
  urgency: 'upcoming' | 'due' | 'overdue'
  balanceCents?: number
  currency?: string
  hasInternalNote?: boolean
  locale: 'fr' | 'en' | 'de'
}

function calendarDayDifference(fromIso: string, toIso: string) {
  const [fromYear, fromMonth, fromDay] = fromIso.split('-').map(Number)
  const [toYear, toMonth, toDay] = toIso.split('-').map(Number)
  return Math.round((Date.UTC(toYear!, toMonth! - 1, toDay!) - Date.UTC(fromYear!, fromMonth! - 1, fromDay!)) / 86_400_000)
}

function quoteMilestone(daysUntilDue: number, offsets: number[]) {
  if (!offsets.includes(daysUntilDue)) return null
  if (daysUntilDue > 0) return { milestone: `avant-echeance-${daysUntilDue}j`, urgency: 'upcoming' as const }
  if (daysUntilDue === 0) return { milestone: 'echeance', urgency: 'due' as const }
  return null
}

function invoiceMilestone(daysUntilDue: number, offsets: number[]) {
  if (!offsets.includes(daysUntilDue)) return null
  if (daysUntilDue > 0) return { milestone: `avant-echeance-${daysUntilDue}j`, urgency: 'upcoming' as const }
  if (daysUntilDue === 0) return { milestone: 'echeance', urgency: 'due' as const }
  if (daysUntilDue < 0) return { milestone: `retard-${Math.abs(daysUntilDue)}j`, urgency: 'overdue' as const }
  return null
}

export function buildPipelineReminderPlan(input: {
  today: string
  clients: ReminderPlanClient[]
  quotes: ReminderPlanQuote[]
  invoices: ReminderPlanInvoice[]
  sentReminderKeys?: Iterable<string>
  quoteOffsets?: number[]
  invoiceOffsets?: number[]
}) {
  const clientsById = new Map(input.clients.map(client => [Number(client.id), client]))
  const sentKeys = new Set(input.sentReminderKeys || [])
  const candidates: PipelineReminderCandidate[] = []
  const skipped = { alreadySent: 0, missingContact: 0, outsideMilestone: 0, paused: 0 }

  const addCandidate = (target: ReminderTarget, row: ReminderPlanQuote | ReminderPlanInvoice, dueDate: string, milestone: { milestone: string, urgency: PipelineReminderCandidate['urgency'] }) => {
    const clientId = Number(row.client_id || 0)
    const client = clientsById.get(clientId)
    if (!clientId || !client?.email) {
      skipped.missingContact += 1
      return
    }
    const reminderKey = `${target}:${row.id}:${milestone.milestone}`
    if (sentKeys.has(reminderKey)) {
      skipped.alreadySent += 1
      return
    }
    candidates.push({
      reminderKey,
      targetType: target,
      targetId: Number(row.id),
      clientId,
      clientName: String(client.name || ''),
      email: String(client.email),
      number: String(row.number),
      title: target === 'quote' ? String((row as ReminderPlanQuote).title || '') || null : null,
      dueDate,
      milestone: milestone.milestone,
      urgency: milestone.urgency,
      balanceCents: target === 'invoice' ? Number((row as ReminderPlanInvoice).balance_cents || 0) : undefined,
      currency: target === 'invoice' ? String((row as ReminderPlanInvoice).currency || 'CHF') : undefined,
      locale: client.preferred_locale === 'en' || client.preferred_locale === 'de' ? client.preferred_locale : 'fr',
    })
  }

  for (const client of input.clients) {
    if (client.status !== 'lead' || !client.next_follow_up_at) continue
    const daysUntilDue = calendarDayDifference(input.today, client.next_follow_up_at)
    if (daysUntilDue > 0) {
      skipped.outsideMilestone += 1
      continue
    }
    if (!client.email) {
      skipped.missingContact += 1
      continue
    }
    const reminderKey = `lead:${client.id}:relance-${client.next_follow_up_at}`
    if (sentKeys.has(reminderKey)) {
      skipped.alreadySent += 1
      continue
    }
    candidates.push({
      reminderKey,
      targetType: 'lead',
      targetId: Number(client.id),
      clientId: Number(client.id),
      clientName: String(client.name || ''),
      email: String(client.email),
      number: String(client.name || `Prospect #${client.id}`),
      title: null,
      dueDate: client.next_follow_up_at,
      milestone: 'relance-prospect',
      urgency: daysUntilDue < 0 ? 'overdue' : 'due',
      hasInternalNote: Boolean(client.follow_up_note?.trim()),
      locale: client.preferred_locale === 'en' || client.preferred_locale === 'de' ? client.preferred_locale : 'fr',
    })
  }

  for (const quote of input.quotes) {
    if (quote.status !== 'sent' || !quote.valid_until) continue
    const milestone = quoteMilestone(calendarDayDifference(input.today, quote.valid_until), input.quoteOffsets || [3, 0])
    if (!milestone) {
      skipped.outsideMilestone += 1
      continue
    }
    addCandidate('quote', quote, quote.valid_until, milestone)
  }

  for (const invoice of input.invoices) {
    if (!['sent', 'overdue'].includes(invoice.status) || !invoice.due_at) continue
    if (invoice.reminders_paused) { skipped.paused += 1; continue }
    if (Number(invoice.balance_cents || 0) <= 0) continue
    const milestone = invoiceMilestone(calendarDayDifference(input.today, invoice.due_at), input.invoiceOffsets || [2, 0, -3, -10, -20])
    if (!milestone) {
      skipped.outsideMilestone += 1
      continue
    }
    addCandidate('invoice', invoice, invoice.due_at, milestone)
  }

  candidates.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.number.localeCompare(b.number))
  return { candidates, skipped }
}
