export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.path.startsWith('/admin') && to.path !== '/admin/login') {
    const auth = useAuthStore()
    await auth.checkSession()
    if (!auth.isAuthenticated) {
      return navigateTo('/admin/login')
    }
  }
})
