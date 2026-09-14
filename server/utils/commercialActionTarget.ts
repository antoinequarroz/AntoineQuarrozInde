export type CommercialActionTarget = {
  kind: 'lead' | 'quote' | 'invoice' | 'task'
  sourceId: number
  table: 'clients' | 'quotes' | 'invoices' | 'tasks'
  clientColumn: 'id' | 'client_id'
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
  const sourceId = Number(rawSourceId)
  if (!Number.isSafeInteger(sourceId) || sourceId <= 0) return null
  const target = targetByKind[kind as keyof typeof targetByKind]
  return { kind: kind as CommercialActionTarget['kind'], sourceId, ...target }
}
