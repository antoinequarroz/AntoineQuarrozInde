import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const correlationId = '0199c7a3-1b7d-7000-8000-123456789abc'

describe('admin commercial health', () => {
  const queryResult = vi.fn()
  const eq = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    queryResult.mockReset()
    eq.mockReset()
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('requireAdmin', vi.fn().mockResolvedValue({ org: { id: 'org-1' } }))
    vi.stubGlobal('getQuery', () => ({ hours: '999' }))
    vi.stubGlobal('createError', (input: object) => Object.assign(new Error('request failed'), input))

    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn(() => chain)
    chain.eq = eq.mockImplementation(() => chain)
    chain.in = vi.fn(() => chain)
    chain.gte = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    chain.limit = vi.fn(() => queryResult())
    vi.stubGlobal('getSupabaseAdmin', () => ({ from: vi.fn(() => chain) }))
  })

  it('bounds the window, filters by tenant and returns action-safe incidents', async () => {
    queryResult.mockResolvedValue({
      data: [{
        action: 'commercial_workflow.failure',
        entity_type: 'invoice',
        entity_id: '42',
        payload: { correlationId, stage: 'payment', outcome: 'failure', code: 'payment_record_failed', email: 'hidden@example.com' },
        created_at: '2026-09-14T09:00:00Z',
      }],
      error: null,
    })
    const { default: handler } = await import('../server/api/admin/commercial-health.get')
    const result = await handler({ context: {} } as never)

    expect(eq).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(result.windowHours).toBe(168)
    expect(result.status).toBe('degraded')
    expect(result.incidents[0]).toMatchObject({
      correlationId,
      stage: 'payment',
      action: { label: 'Vérifier les paiements', to: '/admin/payments' },
    })
    expect(JSON.stringify(result)).not.toContain('hidden@example.com')
  })

  it('fails with a closed message when the source is unavailable', async () => {
    queryResult.mockResolvedValue({ data: null, error: { message: 'internal database detail' } })
    const { default: handler } = await import('../server/api/admin/commercial-health.get')
    await expect(handler({ context: {} } as never)).rejects.toMatchObject({
      statusCode: 500,
      message: 'La santé du parcours commercial est momentanément indisponible.',
    })
  })

  it('renders a responsive read-only health summary in the existing incident page', async () => {
    const page = await readFile('app/pages/admin/errors/index.vue', 'utf8')
    expect(page).toContain('Santé du parcours commercial')
    expect(page).toContain('sm:grid-cols-2 xl:grid-cols-4')
    expect(page).toContain('Corrélation {{ incident.correlationId }}')
    expect(page).toContain('Copier l’identifiant')
    expect(page).toContain(':to="incident.action.to"')
  })

  it('instruments invoice creation with closed outcomes', async () => {
    const endpoint = await readFile('server/api/invoices.post.ts', 'utf8')
    expect(endpoint).toContain("stage: 'invoice'")
    expect(endpoint).toContain("code: 'invoice_creation_failed'")
    expect(endpoint).toContain("usedCompatibilityRetry ? 'recovered' : 'success'")
    expect(endpoint).not.toContain('code: error.message')
  })
})
