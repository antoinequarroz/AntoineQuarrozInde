import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('transactional portal notifications', () => {
  it('uses Resend idempotency keys and records delivery outcomes', () => {
    const email = source('../server/utils/transactionalEmail.ts')
    expect(email).toContain('{ idempotencyKey: input.idempotencyKey.slice(0, 256) }')
    expect(email).toContain(".notification_sent`")
    expect(email).toContain(".notification_failed`")
  })

  it('notifies Antoine only after an atomic quote decision', () => {
    for (const file of ['../server/api/portal/quotes/accept.post.ts', '../server/api/portal/quotes/reject.post.ts']) {
      const decision = source(file)
      expect(decision.indexOf(".eq('status', 'sent')")).toBeLessThan(decision.indexOf('notifyOperationalEvent'))
    }
  })

  it('deduplicates TWINT receipts with the provider payment id', () => {
    const webhook = source('../server/api/webhooks/stripe.post.ts')
    expect(webhook).toContain('`twint-admin-${providerPaymentId}`')
    expect(webhook).toContain('`twint-client-${providerPaymentId}`')
    expect(webhook.indexOf('if (!duplicate)')).toBeLessThan(webhook.indexOf('twint-client-${providerPaymentId}'))
  })

  it('sends project updates only for client-visible or completed work', () => {
    const create = source('../server/api/project-cockpit.post.ts')
    const update = source('../server/api/project-cockpit.put.ts')
    expect(create).toContain("kind === 'note' && data.client_visible")
    expect(create).toContain("kind === 'deliverable' && data.client_visible")
    expect(update).toContain("kind === 'milestone' && data.status === 'done'")
  })
})
