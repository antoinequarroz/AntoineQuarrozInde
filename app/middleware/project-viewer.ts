export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const auth = useAuthStore()
  await auth.checkSession()
  if (!auth.isAuthenticated) return navigateTo('/admin/login')

  const activeMembership = auth.organizations.find(organization => organization.id === auth.currentOrganizationId)
  const allowedRoles = new Set(['owner', 'admin', 'manager', 'viewer'])
  if (!activeMembership || !allowedRoles.has(activeMembership.role)) return navigateTo('/portal')
})
