import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  recordCommercialWorkflowEvent,
  resolveCommercialCorrelationId,
  summarizeCommercialWorkflow,
} from '../server/utils/commercialObservability'

const correlationId = '0199c7a3-1b7d-7000-8000-123456789abc'

describe('commercial workflow observability', () => {
  const logAudit = vi.fn()
  const reportApplicationError = vi.fn()
  const setHeader = vi.fn()

  beforeEach(() => {
    logAudit.mockReset()
    reportApplicationError.mockReset()
    setHeader.mockReset()
    vi.stubGlobal('logAudit', logAudit)
    vi.stubGlobal('reportApplicationError', reportApplicationError)
    vi.stubGlobal('setHeader', setHeader)
  })

  it('keeps a valid opaque correlation id and replaces an invalid value', () => {
    vi.stubGlobal('getHeader', vi.fn().mockReturnValue(correlationId.toUpperCase()))
    const event = { context: {} } as never
    expect(resolveCommercialCorrelationId(event)).toBe(correlationId)
    expect(setHeader).toHaveBeenCalledWith(event, 'X-Correlation-ID', correlationId)

    vi.stubGlobal('getHeader', vi.fn().mockReturnValue('client@example.com secret'))
    expect(resolveCommercialCorrelationId({ context: {} } as never)).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('writes only the closed payload and reports a correlated failure', async () => {
    const event = { context: {} } as any
    await recordCommercialWorkflowEvent({
      event,
      correlationId,
      organizationId: 'org-1',
      actorUserId: 'user-1',
      stage: 'payment',
      outcome: 'failure',
      entityType: 'invoice',
      entityId: 42,
      code: 'provider failed: client@example.com',
      email: 'client@example.com',
      bankReference: 'CH-secret',
    } as never)

    const auditInput = logAudit.mock.calls[0]?.[0]
    expect(auditInput.payload).toEqual({ correlationId, stage: 'payment', outcome: 'failure', code: 'unexpected_failure' })
    expect(JSON.stringify(auditInput)).not.toContain('client@example.com')
    expect(JSON.stringify(auditInput)).not.toContain('CH-secret')
    expect(reportApplicationError).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-1',
      metadata: auditInput.payload,
    }))
    expect(event.context.commercialErrorReported).toBe(true)
  })

  it('treats a later idempotent recovery as resolved without erasing history', () => {
    const summary = summarizeCommercialWorkflow([
      { action: 'commercial_workflow.failure', entity_type: 'quote', entity_id: '42', payload: { correlationId, stage: 'quote', outcome: 'failure', code: 'quote_conversion_failed' }, created_at: '2026-09-14T09:00:00Z' },
      { action: 'commercial_workflow.recovered', entity_type: 'invoice', entity_id: '73', payload: { correlationId, stage: 'quote', outcome: 'recovered', code: 'invoice_already_created' }, created_at: '2026-09-14T09:01:00Z' },
    ])

    expect(summary.status).toBe('healthy')
    expect(summary.totals).toEqual({ success: 0, failure: 1, recovered: 1, unresolved: 0 })
    expect(summary.stages.find(stage => stage.stage === 'quote')).toMatchObject({ failure: 1, recovered: 1, unresolved: 0 })
  })
})
