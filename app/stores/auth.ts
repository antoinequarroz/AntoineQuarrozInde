export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const accessToken = ref<string | null>(null)
  const userEmail = ref<string | null>(null)
  const loading = ref(false)

  async function checkSession() {
    const client = useSupabaseClient()
    const { data } = await client.auth.getSession()
    const session = data.session
    isAuthenticated.value = !!session
    accessToken.value = session?.access_token ?? null
    userEmail.value = session?.user?.email ?? null
    return isAuthenticated.value
  }

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true
    try {
      const client = useSupabaseClient()
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error || !data.session) return false
      isAuthenticated.value = true
      accessToken.value = data.session.access_token
      userEmail.value = data.user?.email ?? null
      return true
    }
    finally {
      loading.value = false
    }
  }

  async function logout() {
    const client = useSupabaseClient()
    await client.auth.signOut()
    isAuthenticated.value = false
    accessToken.value = null
    userEmail.value = null
  }

  function authHeader() {
    return accessToken.value ? { authorization: `Bearer ${accessToken.value}` } : {}
  }

  return { isAuthenticated, accessToken, userEmail, loading, checkSession, login, logout, authHeader }
})
