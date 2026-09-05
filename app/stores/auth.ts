export const useAuthStore = defineStore('auth', () => {
  type OrganizationMembership = {
    id: string
    name: string
    slug: string
    role: 'owner' | 'admin' | 'manager' | 'viewer' | 'client'
  }

  const isAuthenticated = ref(false)
  const accessToken = ref<string | null>(null)
  const userEmail = ref<string | null>(null)
  const organizations = ref<OrganizationMembership[]>([])
  const currentOrganizationId = ref<string | null>(null)
  const loading = ref(false)

  function organizationStorageKey() {
    return `aq_current_organization:${userEmail.value ?? 'anonymous'}`
  }

  function persistedOrganizationId() {
    if (!import.meta.client) return null
    return localStorage.getItem(organizationStorageKey())
  }

  function persistOrganizationId(id: string | null) {
    if (!import.meta.client) return
    const key = organizationStorageKey()
    if (id) localStorage.setItem(key, id)
    else localStorage.removeItem(key)
  }

  async function loadOrganizations() {
    if (!accessToken.value) return
    const rows = await $fetch<OrganizationMembership[]>('/api/admin/organizations', {
      headers: { authorization: `Bearer ${accessToken.value}` },
    })
    organizations.value = rows

    if (rows.length > 0) {
      const preferredId = currentOrganizationId.value ?? persistedOrganizationId()
      currentOrganizationId.value = rows.some(o => o.id === preferredId)
        ? preferredId
        : (rows.at(0)?.id ?? null)
      persistOrganizationId(currentOrganizationId.value)
    } else {
      currentOrganizationId.value = null
      persistOrganizationId(null)
    }
  }

  async function checkSession() {
    const client = useSupabaseClient()
    let { data } = await client.auth.getSession()
    let session = data.session

    // iOS PWA standalone can temporarily return null on cold wake.
    // getUser() forces a refresh path and usually restores session state.
    if (!session) {
      await client.auth.getUser()
      const retry = await client.auth.getSession()
      data = retry.data
      session = data.session
    }

    isAuthenticated.value = !!session
    accessToken.value = session?.access_token ?? null
    userEmail.value = session?.user?.email ?? null
    if (isAuthenticated.value) {
      await loadOrganizations()
    } else {
      organizations.value = []
      currentOrganizationId.value = null
    }
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
      await loadOrganizations()
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
    organizations.value = []
    currentOrganizationId.value = null
  }

  function authHeader() {
    if (!accessToken.value) return {}
    const headers: Record<string, string> = {
      authorization: `Bearer ${accessToken.value}`,
    }
    if (currentOrganizationId.value) {
      headers['x-organization-id'] = currentOrganizationId.value
    }
    return headers
  }

  function setCurrentOrganization(id: string) {
    if (!organizations.value.some(organization => organization.id === id)) return
    currentOrganizationId.value = id
    persistOrganizationId(id)
  }

  return {
    isAuthenticated,
    accessToken,
    userEmail,
    organizations,
    currentOrganizationId,
    loading,
    checkSession,
    login,
    logout,
    authHeader,
    setCurrentOrganization,
    loadOrganizations,
  }
})
