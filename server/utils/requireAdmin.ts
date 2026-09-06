import { resolveOrganizationContext } from './organizationAccess'
import { requireAdminMfa } from './adminMfa'

export async function requireAdmin(event: any) {
  const org = await resolveOrganizationContext(event, {
    requireAuth: true,
    minRole: 'manager',
  })
  const user = event.context.user
  const restrictedEmail = String(useRuntimeConfig().adminEmail || '').trim().toLowerCase()
  const userEmail = String(user?.email || '').trim().toLowerCase()

  if (restrictedEmail && userEmail !== restrictedEmail) {
    throw createError({ statusCode: 403, message: 'Administrative access is restricted' })
  }

  await requireAdminMfa(event, user)

  return { user, org }
}
