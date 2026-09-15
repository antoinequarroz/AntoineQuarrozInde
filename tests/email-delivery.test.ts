import { beforeEach, describe, expect, it, vi } from 'vitest'
import { retryTrackedEmail, sendTrackedEmail } from '../server/utils/emailDelivery'

function query(result: any) {
  const value: any = {}
  for (const method of ['select', 'eq', 'lt', 'order', 'range']) value[method] = () => value
  value.maybeSingle = async () => result
  value.single = async () => result
  value.then = (resolve: (input: any) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(result).then(resolve, reject)
  return value
}

function database(options: { optedOut?: boolean, duplicate?: boolean, existingStatus?: string } = {}) {
  const inserts: any[] = []
  const updates: any[] = []
  return {
    inserts,
    updates,
    from(table: string) {
      return {
        select: () => query(table === 'clients' ? { data: { marketing_opt_out_at: options.optedOut ? '2026-09-15T00:00:00Z' : null }, error: null } : { data: { id: 1, status: options.existingStatus || 'sent', provider_id: 'mail-existing' }, error: null }),
        insert(payload: any) {
          inserts.push(payload)
          return query(options.duplicate ? { data: null, error: { code: '23505' } } : { data: { id: 1, status: payload.status, provider_id: null }, error: null })
        },
        update(payload: any) {
          updates.push(payload)
          return query({ data: null, error: null })
        },
      }
    },
  }
}

const base = {
  organizationId: 'org-1', clientId: 7, category: 'transactional' as const, templateKey: 'quote_available' as const,
  locale: 'fr' as const, recipient: 'Client@Example.com', entityType: 'quote' as const, entityId: 42,
  idempotencyKey: 'org-1:quote:42', subject: 'Devis', text: 'Texte', html: '<p>Texte</p>',
}

describe('tracked email delivery', () => {
  beforeEach(() => {
    vi.stubGlobal('createError', (input: object) => Object.assign(new Error('delivery error'), input))
  })

  it('reserves before sending and records provider success', async () => {
    const db = database()
    const send = vi.fn().mockResolvedValue({ emailId: 'mail-1' })
    const result = await sendTrackedEmail({ ...base, replyTo: 'prospect@example.com' }, { supabase: db, send })
    expect(db.inserts[0]).toMatchObject({ organization_id: 'org-1', recipient: 'client@example.com', status: 'pending' })
    expect(send).toHaveBeenCalledOnce()
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ replyTo: 'prospect@example.com' }))
    expect(db.updates).toContainEqual(expect.objectContaining({ status: 'sent', provider_id: 'mail-1' }))
    expect(result.status).toBe('sent')
  })

  it('never sends a duplicate idempotency key', async () => {
    const db = database({ duplicate: true })
    const send = vi.fn()
    const result = await sendTrackedEmail(base, { supabase: db, send })
    expect(send).not.toHaveBeenCalled()
    expect(result).toMatchObject({ duplicate: true, status: 'sent', emailId: 'mail-existing' })
  })

  it.each(['pending', 'failed', 'uncertain'])('never reports a replayed %s delivery as successful', async (existingStatus) => {
    const db = database({ duplicate: true, existingStatus })
    const send = vi.fn()
    await expect(sendTrackedEmail(base, { supabase: db, send })).rejects.toMatchObject({ statusCode: 409 })
    expect(send).not.toHaveBeenCalled()
  })

  it('marks an ambiguous timeout uncertain and does not retry automatically', async () => {
    const db = database()
    const timeout = Object.assign(new Error('request timeout'), { name: 'AbortError' })
    await expect(sendTrackedEmail(base, { supabase: db, send: vi.fn().mockRejectedValue(timeout) })).rejects.toThrow('timeout')
    expect(db.updates).toContainEqual(expect.objectContaining({ status: 'uncertain', error_code: 'timeout_ambiguous' }))
  })

  it('records a confirmed provider failure as retryable', async () => {
    const db = database()
    const rejected = Object.assign(new Error('rejected'), { statusCode: 502 })
    await expect(sendTrackedEmail(base, { supabase: db, send: vi.fn().mockRejectedValue(rejected) })).rejects.toThrow('rejected')
    expect(db.updates).toContainEqual(expect.objectContaining({ status: 'failed', error_code: 'provider_rejected' }))
  })

  it('audits a marketing opt-out without contacting the provider', async () => {
    const db = database({ optedOut: true })
    const send = vi.fn()
    const result = await sendTrackedEmail({ ...base, category: 'marketing' }, { supabase: db, send })
    expect(result.status).toBe('suppressed')
    expect(db.inserts[0]).toMatchObject({ status: 'suppressed', error_code: 'marketing_opt_out' })
    expect(send).not.toHaveBeenCalled()
  })

  it('keeps transactional documents enabled for an opted-out client', async () => {
    const db = database({ optedOut: true })
    const send = vi.fn().mockResolvedValue({ emailId: 'transactional-1' })
    const result = await sendTrackedEmail(base, { supabase: db, send })
    expect(result.status).toBe('sent')
    expect(send).toHaveBeenCalledOnce()
  })

  it('cancels a reserved reminder when the final eligibility check changed', async () => {
    const db = database()
    const send = vi.fn()
    const result = await sendTrackedEmail({ ...base, beforeSend: vi.fn().mockResolvedValue(false) }, { supabase: db, send })
    expect(result.status).toBe('suppressed')
    expect(send).not.toHaveBeenCalled()
  })

  it('allows a controlled retry only from a claimed failed delivery', async () => {
    const updates: any[] = []
    const db = {
      from() {
        return {
          select() {
            return query({ data: { id: 9, idempotency_key: 'safe-key', template_key: 'invoice_available', attempt_count: 1 }, error: null })
          },
          update(payload: any) {
            updates.push(payload)
            if (payload.status === 'pending') return query({ data: { id: 9, idempotency_key: 'safe-key', template_key: 'invoice_available', attempt_count: 1 }, error: null })
            return query({ data: null, error: null })
          },
        }
      },
    }
    const send = vi.fn().mockResolvedValue({ emailId: 'mail-retry' })
    const result = await retryTrackedEmail({ organizationId: 'org-1', deliveryId: 9, recipient: 'a@example.com', subject: 'Facture', text: 'T', html: '<p>T</p>', replyTo: 'prospect@example.com' }, { supabase: db, send })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'safe-key', replyTo: 'prospect@example.com' }))
    expect(updates).toContainEqual(expect.objectContaining({ attempt_count: 2 }))
    expect(result.status).toBe('sent')
  })

  it('cancels a claimed retry when the final eligibility check changed', async () => {
    const updates: any[] = []
    const db = {
      from() {
        return {
          select() {
            return query({ data: { id: 9, idempotency_key: 'safe-key', template_key: 'invoice_reminder', attempt_count: 1 }, error: null })
          },
          update(payload: any) {
            updates.push(payload)
            if (payload.status === 'pending') return query({ data: { id: 9, idempotency_key: 'safe-key', template_key: 'invoice_reminder', attempt_count: 1 }, error: null })
            return query({ data: null, error: null })
          },
        }
      },
    }
    const send = vi.fn()
    const result = await retryTrackedEmail({ organizationId: 'org-1', deliveryId: 9, recipient: 'a@example.com', subject: 'Relance', text: 'T', html: '<p>T</p>', beforeSend: vi.fn().mockResolvedValue(false) }, { supabase: db, send })
    expect(result.status).toBe('suppressed')
    expect(send).not.toHaveBeenCalled()
  })
})
