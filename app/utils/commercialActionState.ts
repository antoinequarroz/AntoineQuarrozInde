export type CommercialActionStatus = 'handled' | 'snoozed' | 'ignored'

export type CommercialActionState = {
  actionKey: string
  status: CommercialActionStatus
  snoozedUntil: string | null
  updatedAt: string
}

type AuditStateRow = {
  payload?: unknown
  created_at?: unknown
}

const validStatuses = new Set<CommercialActionStatus>(['handled', 'snoozed', 'ignored'])
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

export function isCommercialActionStatus(value: unknown): value is CommercialActionStatus {
  return typeof value === 'string' && validStatuses.has(value as CommercialActionStatus)
}

export function normalizeCommercialActionStates(rows: AuditStateRow[]) {
  const states: Record<string, CommercialActionState> = {}

  for (const row of rows) {
    if (!row.payload || typeof row.payload !== 'object') continue
    const payload = row.payload as Record<string, unknown>
    const actionKey = typeof payload.actionKey === 'string' ? payload.actionKey.trim() : ''
    const status = payload.status
    const snoozedUntil = typeof payload.snoozedUntil === 'string' && isoDatePattern.test(payload.snoozedUntil)
      ? payload.snoozedUntil
      : null
    const updatedAt = typeof row.created_at === 'string' ? row.created_at : ''

    if (!actionKey || states[actionKey] || !isCommercialActionStatus(status)) continue
    if (status === 'snoozed' && !snoozedUntil) continue

    states[actionKey] = {
      actionKey,
      status,
      snoozedUntil: status === 'snoozed' ? snoozedUntil : null,
      updatedAt,
    }
  }

  return states
}

export function isCommercialActionVisible(
  actionKey: string,
  states: Record<string, CommercialActionState>,
  today: string,
) {
  const state = states[actionKey]
  if (!state) return true
  if (state.status === 'handled' || state.status === 'ignored') return false
  return !state.snoozedUntil || state.snoozedUntil <= today
}
