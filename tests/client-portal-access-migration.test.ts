import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../supabase/migrations/20260810123730_client_portal_access_lifecycle.sql', import.meta.url), 'utf8')

describe('client portal access lifecycle migration', () => {
  it('links Auth identities inside an organization without exposing credentials', () => {
    expect(migration).toContain('portal_user_id uuid references auth.users(id) on delete set null')
    expect(migration).toContain('clients_organization_portal_user_uidx')
    expect(migration).toContain('(organization_id, portal_user_id)')
  })

  it('tracks invitation, activation and reversible access suspension', () => {
    expect(migration).toContain('portal_invited_at timestamptz')
    expect(migration).toContain('portal_activated_at timestamptz')
    expect(migration).toContain('portal_access_disabled_at timestamptz')
  })
})
