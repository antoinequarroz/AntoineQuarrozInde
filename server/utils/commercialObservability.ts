import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'

export const COMMERCIAL_WORKFLOW_STAGES = ['lead', 'quote', 'invoice', 'payment'] as const
export const COMMERCIAL_WORKFLOW_OUTCOMES = ['success', 'failure', 'recovered'] as const

export type CommercialWorkflowStage = typeof COMMERCIAL_WORKFLOW_STAGES[number]
export type CommercialWorkflowOutcome = typeof COMMERCIAL_WORKFLOW_OUTCOMES[number]

const SAFE_CORRELATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SAFE_FAILURE_CODE = /^[a-z][a-z0-9_]{0,63}$/

type CommercialWorkflowEvent = {
  correlationId: string
  stage: CommercialWorkflowStage
  outcome: CommercialWorkflowOutcome
  code: string | null
  createdAt: string
  entityType?: string | null
  entityId?: string | number | null
}

type RecordCommercialWorkflowInput = {
  event?: H3Event
  correlationId: string
  organizationId: string
  actorUserId?: string | null
  stage: CommercialWorkflowStage
  outcome: CommercialWorkflowOutcome
  entityType: 'client' | 'quote' | 'invoice' | 'payment'
  entityId?: string | number | null
  clientId?: number | null
  code?: string | null
}

export function resolveCommercialCorrelationId(event: H3Event) {
  const candidate = String(getHeader(event, 'x-correlation-id') || '').trim()
  const correlationId = SAFE_CORRELATION_ID.test(candidate) ? candidate.toLowerCase() : randomUUID()
  setHeader(event, 'X-Correlation-ID', correlationId)
  event.context.commercialCorrelationId = correlationId
  return correlationId
}

function safeFailureCode(value: string | null | undefined) {
  if (!value) return null
  return SAFE_FAILURE_CODE.test(value) ? value : 'unexpected_failure'
}

export async function recordCommercialWorkflowEvent(input: RecordCommercialWorkflowInput) {
  const code = safeFailureCode(input.code)
  const payload = {
    correlationId: SAFE_CORRELATION_ID.test(input.correlationId) ? input.correlationId.toLowerCase() : randomUUID(),
    stage: input.stage,
    outcome: input.outcome,
    code,
  }

  await logAudit({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: `commercial_workflow.${input.outcome}`,
    entityType: input.entityType,
    entityId: input.entityId,
    clientId: input.clientId,
    payload,
  })

  if (input.outcome === 'failure') {
    await reportApplicationError({
      source: 'server',
      severity: 'error',
      message: `Commercial workflow failure: ${input.stage}`,
      path: null,
      organizationId: input.organizationId,
      metadata: payload,
    })
    if (input.event) input.event.context.commercialErrorReported = true
  }

  return payload
}

export function parseCommercialWorkflowEvent(row: {
  action?: unknown
  entity_type?: unknown
  entity_id?: unknown
  payload?: unknown
  created_at?: unknown
}): CommercialWorkflowEvent | null {
  const payload = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
    ? row.payload as Record<string, unknown>
    : {}
  const outcome = String(row.action || '').replace('commercial_workflow.', '') as CommercialWorkflowOutcome
  const stage = payload.stage as CommercialWorkflowStage
  const correlationId = String(payload.correlationId || '')
  if (!COMMERCIAL_WORKFLOW_OUTCOMES.includes(outcome) || !COMMERCIAL_WORKFLOW_STAGES.includes(stage) || !SAFE_CORRELATION_ID.test(correlationId)) return null
  return {
    correlationId: correlationId.toLowerCase(),
    stage,
    outcome,
    code: safeFailureCode(typeof payload.code === 'string' ? payload.code : null),
    createdAt: String(row.created_at || ''),
    entityType: typeof row.entity_type === 'string' ? row.entity_type : null,
    entityId: typeof row.entity_id === 'string' || typeof row.entity_id === 'number' ? row.entity_id : null,
  }
}

const ACTION_BY_STAGE: Record<CommercialWorkflowStage, { label: string, to: string }> = {
  lead: { label: 'Vérifier les prospects', to: '/admin/crm' },
  quote: { label: 'Vérifier les devis', to: '/admin/quotes' },
  invoice: { label: 'Vérifier les factures', to: '/admin/invoices' },
  payment: { label: 'Vérifier les paiements', to: '/admin/payments' },
}

export function summarizeCommercialWorkflow(rows: Array<Parameters<typeof parseCommercialWorkflowEvent>[0]>) {
  const events = rows.map(parseCommercialWorkflowEvent).filter((event): event is CommercialWorkflowEvent => Boolean(event))
  const latestByOperation = new Map<string, CommercialWorkflowEvent>()
  for (const event of events) {
    const key = `${event.correlationId}:${event.stage}`
    const previous = latestByOperation.get(key)
    if (!previous || event.createdAt > previous.createdAt) latestByOperation.set(key, event)
  }

  const stages = COMMERCIAL_WORKFLOW_STAGES.map((stage) => {
    const stageEvents = events.filter(event => event.stage === stage)
    const unresolved = [...latestByOperation.values()].filter(event => event.stage === stage && event.outcome === 'failure')
    return {
      stage,
      success: stageEvents.filter(event => event.outcome === 'success').length,
      failure: stageEvents.filter(event => event.outcome === 'failure').length,
      recovered: stageEvents.filter(event => event.outcome === 'recovered').length,
      unresolved: unresolved.length,
    }
  })

  const incidents = [...latestByOperation.values()]
    .filter(event => event.outcome === 'failure')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map(event => ({
      correlationId: event.correlationId,
      stage: event.stage,
      code: event.code,
      createdAt: event.createdAt,
      entityType: event.entityType,
      entityId: event.entityId,
      action: ACTION_BY_STAGE[event.stage],
    }))

  return {
    status: incidents.length ? 'degraded' as const : 'healthy' as const,
    totals: {
      success: events.filter(event => event.outcome === 'success').length,
      failure: events.filter(event => event.outcome === 'failure').length,
      recovered: events.filter(event => event.outcome === 'recovered').length,
      unresolved: incidents.length,
    },
    stages,
    incidents,
  }
}
