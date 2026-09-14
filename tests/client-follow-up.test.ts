import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'
import {
  listChangedFollowUpFields,
  normalizeClientFollowUp,
  normalizeFollowUpDate,
  normalizeFollowUpNote,
  normalizeLastContactedAt,
} from '../server/utils/clientFollowUp'

describe('client follow-up contract', () => {
  it('normalizes bounded follow-up values without inventing omitted fields', () => {
    expect(normalizeClientFollowUp({
      nextFollowUpAt: '2026-09-21',
      followUpNote: '  Reprendre contact après le lancement.  ',
      lastContactedAt: '2026-09-14T08:15:30+02:00',
    })).toEqual({
      next_follow_up_at: '2026-09-21',
      follow_up_note: 'Reprendre contact après le lancement.',
      last_contacted_at: '2026-09-14T06:15:30.000Z',
    })
    expect(normalizeClientFollowUp({ followUpNote: null })).toEqual({ follow_up_note: null })
    expect(normalizeClientFollowUp({})).toEqual({})
  })

  it('rejects invalid or unbounded date and note values', () => {
    expect(() => normalizeFollowUpDate('2026-02-30')).toThrow(/invalid/i)
    expect(() => normalizeFollowUpDate('14.09.2026')).toThrow(/YYYY-MM-DD/)
    expect(() => normalizeFollowUpNote('x'.repeat(501))).toThrow(/500/)
    expect(() => normalizeLastContactedAt('2026-09-14T08:15:30')).toThrow(/timezone/i)
  })

  it('describes changes by field name without exposing the note body', () => {
    const changed = listChangedFollowUpFields(
      { next_follow_up_at: null, follow_up_note: null, last_contacted_at: null },
      { next_follow_up_at: '2026-09-21', follow_up_note: 'Confidentiel' },
    )
    expect(changed).toEqual(['next_follow_up_at', 'follow_up_note'])
    expect(JSON.stringify(changed)).not.toContain('Confidentiel')
  })

  it('keeps client reads and writes organization scoped and note-free in audit payloads', async () => {
    const [getApi, postApi, putApi] = await Promise.all([
      readFile(new URL('../server/api/clients.get.ts', import.meta.url), 'utf8'),
      readFile(new URL('../server/api/clients.post.ts', import.meta.url), 'utf8'),
      readFile(new URL('../server/api/clients.put.ts', import.meta.url), 'utf8'),
    ])

    expect(getApi).toContain(".eq('organization_id', org.id)")
    expect(postApi).toContain('organization_id: org.id')
    expect(putApi.match(/\.eq\('organization_id', org\.id\)/g)).toHaveLength(2)
    expect(putApi).toContain('followUpFieldsChanged: listChangedFollowUpFields')
    expect(postApi).toContain('hasFollowUpNote: Boolean(data.follow_up_note)')
    expect(putApi).toContain('hasFollowUpNote: Boolean(data.follow_up_note)')
    expect(postApi).not.toContain('followUpNote: data.follow_up_note')
    expect(putApi).not.toContain('followUpNote: data.follow_up_note')
  })

  it('keeps the database change additive, bounded and tenant-indexed', async () => {
    const migration = await readFile(
      new URL('../supabase/migrations/20260914084443_add_client_follow_up_fields_after_social.sql', import.meta.url),
      'utf8',
    )

    expect(migration).toContain('add column if not exists next_follow_up_at date')
    expect(migration).toContain('add column if not exists follow_up_note text')
    expect(migration).toContain('add column if not exists last_contacted_at timestamptz')
    expect(migration).toContain('char_length(follow_up_note) <= 500')
    expect(migration).toContain('on public.clients (organization_id, next_follow_up_at)')
    expect(migration).toContain("where next_follow_up_at is not null and status = 'lead'")
    expect(migration).not.toMatch(/\b(?:delete|truncate|drop)\b/i)
  })
})
