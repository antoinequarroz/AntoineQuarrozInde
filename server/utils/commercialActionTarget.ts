export type CommercialActionTarget = {
  kind: 'lead' | 'quote' | 'invoice' | 'task'
  sourceId: number
  table: 'clients' | 'quotes' | 'invoices' | 'tasks'
  clientColumn: 'id' | 'client_id'
  occurrenceDate: string | null
}

const targetByKind = {
  lead: { table: 'clients', clientColumn: 'id' },
  quote: { table: 'quotes', clientColumn: 'client_id' },
  invoice: { table: 'invoices', clientColumn: 'client_id' },
  task: { table: 'tasks', clientColumn: 'client_id' },
} as const

export function parseCommercialActionTarget(actionKey: string): CommercialActionTarget | null {
  const [kind, rawSourceId, extra] = actionKey.split(':')
  if (extra || !kind || !rawSourceId || !(kind in targetByKind)) return null
  const versionedLeadMatch = kind === 'lead'
    ? rawSourceId.match(/^(\d+)(?:_(\d{4}-\d{2}-\d{2}))?$/)
    : null
  const sourceId = Number(versionedLeadMatch?.[1] || rawSourceId)
  if (kind === 'lead' && !versionedLeadMatch) return null
  if (!Number.isSafeInteger(sourceId) || sourceId <= 0) return null
  const target = targetByKind[kind as keyof typeof targetByKind]
  return {
    kind: kind as CommercialActionTarget['kind'],
    sourceId,
    occurrenceDate: versionedLeadMatch?.[2] || null,
    ...target,
  }
}
