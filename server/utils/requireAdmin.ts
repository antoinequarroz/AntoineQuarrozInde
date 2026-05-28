import { resolveOrganizationContext } from './organizationAccess'

export async function requireAdmin(event: any) {
  const org = await resolveOrganizationContext(event, {
    requireAuth: true,
    minRole: 'manager',
  })
  return { user: event.context.user, org }
}
