export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.path === '/portal/login') return

  const auth = useAuthStore()
  await auth.checkSession({ deferOrganizationsUntilMfaChallenge: true })
  if (!auth.isAuthenticated) return navigateTo({ path: '/portal/login', query: { redirect: to.fullPath } })
  if (auth.requiresMfaChallenge) return navigateTo({ path: '/admin/security', query: { redirect: safePortalRedirect(to.fullPath) } })
})
