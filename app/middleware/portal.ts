export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.path === '/portal/login') return

  const auth = useAuthStore()
  await auth.checkSession()
  if (!auth.isAuthenticated) return navigateTo('/portal/login')
})
