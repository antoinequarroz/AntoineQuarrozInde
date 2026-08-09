import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../supabase/migrations/20260809235626_portal_timer_twint_v2.sql', import.meta.url), 'utf8')
const indexes = readFileSync(new URL('../supabase/migrations/20260810002000_portal_timer_twint_v2_fk_indexes.sql', import.meta.url), 'utf8')

describe('portal, timer and TWINT V2 migration', () => {
  it('records auditable quote acceptance evidence', () => {
    expect(migration).toContain('accepted_by_user_id uuid references auth.users')
    expect(migration).toContain('acceptance_ip inet')
    expect(migration).toContain('acceptance_user_agent text')
  })

  it('permits only one active timer per organization and user', () => {
    expect(migration).toContain('project_time_entries_one_running_per_user')
    expect(migration).toContain("where entry_source = 'timer' and stopped_at is null")
    expect(migration).toContain("entry_source in ('manual', 'timer')")
  })

  it('keeps checkout sessions server-only and tenant-safe', () => {
    expect(migration).toContain('payment_checkout_sessions_org_invoice_fk')
    expect(migration).toContain('payment_checkout_sessions_org_client_fk')
    expect(migration).toContain('enable row level security')
    expect(migration).toContain('revoke all on table public.payment_checkout_sessions from anon, authenticated')
    expect(migration).toContain('grant all on table public.payment_checkout_sessions to service_role')
  })

  it('covers the new foreign keys with targeted indexes', () => {
    expect(indexes).toContain('quotes_accepted_by_user_idx')
    expect(indexes).toContain('project_time_entries_created_by_user_idx')
    expect(indexes).toContain('payment_checkout_sessions_invoice_fk_idx')
    expect(indexes).toContain('payment_checkout_sessions_client_fk_idx')
  })
})
