type CommercialClient = {
  id: number
  name: string
  status: 'lead' | 'active' | 'inactive'
  createdAt: string
}

type CommercialQuote = {
  id: number
  number: string
  title: string
  clientId: number | null
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  issuedAt: string | null
  validUntil: string | null
  createdAt: string
}

type CommercialInvoice = {
  id: number
  number: string
  clientId: number | null
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  dueAt: string | null
  totalCents?: number
  amountCents: number
  paidAmountCents: number
  remindersPaused?: boolean
}

export type CommercialTaskSuggestion = {
  key: string
  kind: 'lead' | 'quote' | 'invoice'
  sourceId: number
  title: string
  description: string
  priority: 'medium' | 'high'
  dueDate: string
  clientId: number | null
  projectId: null
  label: string
  reason: string
  to: string
  daysDelta: number
}

function daysBetween(today: string, date: string) {
  const todayTime = Date.parse(`${today}T00:00:00Z`)
  const dateTime = Date.parse(`${date}T00:00:00Z`)
  if (!Number.isFinite(todayTime) || !Number.isFinite(dateTime)) return null
  return Math.round((dateTime - todayTime) / 86_400_000)
}

export function buildCommercialTaskSuggestions(input: {
  today: string
  clients: CommercialClient[]
  quotes: CommercialQuote[]
  invoices: CommercialInvoice[]
  existingTaskTitles?: string[]
}) {
  const existingTitles = new Set(input.existingTaskTitles || [])
  const suggestions: CommercialTaskSuggestion[] = []
  const clientNames = new Map(input.clients.map(client => [client.id, client.name]))
  const clientsWithActiveQuote = new Set(
    input.quotes
      .filter(quote => quote.clientId && ['sent', 'accepted'].includes(quote.status))
      .map(quote => quote.clientId as number),
  )

  for (const client of input.clients) {
    const age = daysBetween(client.createdAt, input.today)
    const title = `[RELANCE PROSPECT ${client.id}]`
    if (client.status !== 'lead' || age === null || age < 7 || clientsWithActiveQuote.has(client.id) || existingTitles.has(title)) continue
    suggestions.push({
      key: `lead:${client.id}`,
      kind: 'lead',
      sourceId: client.id,
      title,
      description: `Reprendre contact avec ${client.name}, prospect sans avancée commerciale depuis ${age} jours.`,
      priority: age >= 14 ? 'high' : 'medium',
      dueDate: input.today,
      clientId: client.id,
      projectId: null,
      label: age >= 14 ? 'Prospect inactif' : 'Prospect à suivre',
      reason: `Sans devis envoyé · ${age} jours`,
      to: `/admin/clients/${client.id}`,
      daysDelta: -age,
    })
  }

  for (const quote of input.quotes) {
    if (quote.status !== 'sent') continue
    const referenceDate = quote.validUntil || quote.issuedAt || quote.createdAt
    const days = daysBetween(input.today, referenceDate)
    const waitingDays = daysBetween(quote.issuedAt || quote.createdAt, input.today)
    const needsFollowUp = quote.validUntil ? days !== null && days <= 3 : waitingDays !== null && waitingDays >= 5
    const title = `[RELANCE DEVIS ${quote.number}]`
    if (!needsFollowUp || existingTitles.has(title)) continue
    suggestions.push({
      key: `quote:${quote.id}`,
      kind: 'quote',
      sourceId: quote.id,
      title,
      description: `Relancer le devis ${quote.number} (${quote.title})${quote.validUntil ? `, valable jusqu’au ${quote.validUntil}` : ''}.`,
      priority: days !== null && days <= 1 ? 'high' : 'medium',
      dueDate: quote.validUntil && quote.validUntil > input.today ? quote.validUntil : input.today,
      clientId: quote.clientId,
      projectId: null,
      label: days !== null && days < 0 ? 'Devis expiré' : 'Devis sans réponse',
      reason: quote.validUntil
        ? days !== null && days < 0 ? `Expiré depuis ${Math.abs(days)} jour(s)` : `Expire dans ${days} jour(s)`
        : `Envoyé depuis ${waitingDays} jour(s)`,
      to: `/admin/quotes?quoteId=${quote.id}`,
      daysDelta: days ?? -(waitingDays || 0),
    })
  }

  for (const invoice of input.invoices) {
    if (!['sent', 'overdue'].includes(invoice.status) || !invoice.dueAt || invoice.remindersPaused) continue
    const days = daysBetween(input.today, invoice.dueAt)
    const balance = Math.max(0, (invoice.totalCents ?? invoice.amountCents) - invoice.paidAmountCents)
    const title = `[RELANCE FACTURE ${invoice.number}]`
    if (days === null || days > 2 || balance <= 0 || existingTitles.has(title)) continue
    suggestions.push({
      key: `invoice:${invoice.id}`,
      kind: 'invoice',
      sourceId: invoice.id,
      title,
      description: `Relancer la facture ${invoice.number}, échéance ${invoice.dueAt}.`,
      priority: days <= 0 ? 'high' : 'medium',
      dueDate: invoice.dueAt > input.today ? invoice.dueAt : input.today,
      clientId: invoice.clientId,
      projectId: null,
      label: days < 0 ? 'Facture en retard' : days === 0 ? 'Échéance aujourd’hui' : 'Échéance proche',
      reason: `${clientNames.get(invoice.clientId || -1) || 'Client'} · ${days < 0 ? `${Math.abs(days)} jour(s) de retard` : days === 0 ? 'à relancer aujourd’hui' : `échéance dans ${days} jour(s)`}`,
      to: `/admin/invoices?invoiceId=${invoice.id}`,
      daysDelta: days,
    })
  }

  const kindOrder = { invoice: 0, lead: 1, quote: 2 }
  return suggestions.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1
    if (a.kind !== b.kind) return kindOrder[a.kind] - kindOrder[b.kind]
    return a.daysDelta - b.daysDelta
  })
}
