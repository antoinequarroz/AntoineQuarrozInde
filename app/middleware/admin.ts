export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.path.startsWith('/admin') && to.path !== '/admin/login') {
    const auth = useAuthStore()
    await auth.checkSession({ deferOrganizationsUntilMfa: true })
    if (!auth.isAuthenticated) {
      return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
    }
    if (auth.requiresAdminMfa) {
      if (to.path === '/admin/security') return
      return navigateTo({ path: '/admin/security', query: { redirect: to.fullPath } })
    }
    const allowedRoles = new Set(to.path === '/admin/security'
      ? ['owner', 'admin', 'manager', 'viewer']
      : ['owner', 'admin', 'manager'])
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
