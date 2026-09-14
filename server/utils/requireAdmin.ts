import { resolveOrganizationContext } from './organizationAccess'
import { requireAdminMfa } from './adminMfa'

export async function requireAdmin(event: any) {
  const org = await resolveOrganizationContext(event, {
    requireAuth: true,
    minRole: 'manager',
  })
  const user = event.context.user
  const config = useRuntimeConfig()
  const restrictedEmail = String(config.adminEmail || '').trim().toLowerCase()
  const e2eAdminEmail = String(config.e2eAdminEmail || '').trim().toLowerCase()
  const userEmail = String(user?.email || '').trim().toLowerCase()
  const isIsolatedE2eAdmin = Boolean(e2eAdminEmail)
    && userEmail === e2eAdminEmail
    && org.slug === 'aq-e2e-sandbox'

  if (restrictedEmail && userEmail !== restrictedEmail && !isIsolatedE2eAdmin) {
    throw createError({ statusCode: 403, message: 'Administrative access is restricted' })
  }

  await requireAdminMfa(event, user)

  return { user, org }
}
