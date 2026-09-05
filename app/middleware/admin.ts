export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.path.startsWith('/admin') && to.path !== '/admin/login') {
    const auth = useAuthStore()
    await auth.checkSession()
    if (!auth.isAuthenticated) {
      return navigateTo('/admin/login')
    }
    const allowedRoles = new Set(['owner', 'admin', 'manager'])
    const administrativeOrganizations = auth.organizations.filter(organization => allowedRoles.has(organization.role))
    if (!administrativeOrganizations.length) {
      return navigateTo('/portal')
    }

    const currentOrganization = auth.organizations.find(organization => organization.id === auth.currentOrganizationId)
    if (!currentOrganization || !allowedRoles.has(currentOrganization.role)) {
      const fallbackOrganization = administrativeOrganizations[0]
      if (fallbackOrganization) auth.setCurrentOrganization(fallbackOrganization.id)
    }
  }
})
