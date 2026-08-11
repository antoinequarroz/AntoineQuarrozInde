import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('client portal access boundaries', () => {
  it('keeps every lifecycle action behind the admin boundary', () => {
    const access = source('../server/utils/clientPortalAccess.ts')
    expect(access).toContain('requireAdmin(event)')
    expect(access).toContain("role !== 'client'")
    expect(access).toContain(".eq('organization_id', org.id)")
  })

  it('suspends only the organization membership and preserves the Auth identity', () => {
    const access = source('../server/utils/clientPortalAccess.ts')
    expect(access).toContain("from('organization_memberships').delete()")
    expect(access).not.toContain('auth.admin.deleteUser')
    expect(access).toContain('portal_access_disabled_at: disabledAt')
  })

  it('uses server-generated temporary links and the transactional provider', () => {
    const access = source('../server/utils/clientPortalAccess.ts')
    expect(access).toContain("generateLink({ type: 'invite'")
    expect(access).toContain("generateLink({ type: 'recovery'")
    expect(access).toContain('sendTransactionalEmail')
    expect(access).toContain('redirectTo: `${siteUrl}/portal/setup`')
  })

  it('resolves portal ownership by immutable user id before legacy email fallback', () => {
    const portal = source('../server/utils/portalAccess.ts')
    expect(portal.indexOf(".eq('portal_user_id', user.id)")).toBeLessThan(portal.indexOf(".ilike('email', user.email)"))
    expect(portal).toContain('client.portal_access_disabled_at')
  })
})
