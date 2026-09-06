export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const auth = useAuthStore()
  await auth.checkSession({ deferOrganizationsUntilMfa: true })
  if (!auth.isAuthenticated) return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
  if (auth.requiresAdminMfa) return navigateTo({ path: '/admin/security', query: { redirect: to.fullPath } })

  const activeMembership = auth.organizations.find(organization => organization.id === auth.currentOrganizationId)
  const allowedRoles = new Set(['owner', 'admin', 'manager', 'viewer'])
  if (!activeMembership || !allowedRoles.has(activeMembership.role)) return navigateTo('/portal')
})
