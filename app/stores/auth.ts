import {
  normalizeAdminMfaMode,
  requiresAdminMfa as shouldRequireAdminMfa,
  type AdminMfaLevel,
} from '../utils/adminMfa'

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
  const mfaCurrentLevel = ref<AdminMfaLevel>(null)
  const mfaNextLevel = ref<AdminMfaLevel>(null)
  const mfaAssuranceKnown = ref(false)
  const mfaError = ref('')
  const adminMfaMode = computed(() => normalizeAdminMfaMode(useRuntimeConfig().public.adminMfaMode))
  const requiresAdminMfa = computed(() => isAuthenticated.value && shouldRequireAdminMfa(
    adminMfaMode.value,
    mfaCurrentLevel.value,
    mfaNextLevel.value,
    mfaAssuranceKnown.value,
  ))
  const requiresMfaChallenge = computed(() => isAuthenticated.value
    && mfaAssuranceKnown.value
    && mfaCurrentLevel.value !== 'aal2'
    && mfaNextLevel.value === 'aal2')

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

  function clearOrganizations() {
    organizations.value = []
    currentOrganizationId.value = null
  }

  function resetMfaState() {
    mfaCurrentLevel.value = null
    mfaNextLevel.value = null
    mfaAssuranceKnown.value = false
    mfaError.value = ''
  }

  function normalizeAssuranceLevel(value: string | null): AdminMfaLevel {
    if (value === 'aal1' || value === 'aal2') return value
    return null
  }

  async function refreshMfaState() {
    mfaAssuranceKnown.value = false
    mfaError.value = ''
    try {
      const client = useSupabaseClient()
      const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error) throw error

      mfaCurrentLevel.value = normalizeAssuranceLevel(data.currentLevel)
      mfaNextLevel.value = normalizeAssuranceLevel(data.nextLevel)
      mfaAssuranceKnown.value = true
      return true
    }
    catch {
      mfaCurrentLevel.value = null
      mfaNextLevel.value = null
      mfaError.value = 'Le niveau de sécurité de la session n’a pas pu être vérifié.'
      return false
    }
  }

  async function checkSession(options: {
    deferOrganizationsUntilMfa?: boolean
    deferOrganizationsUntilMfaChallenge?: boolean
  } = {}) {
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
      await refreshMfaState()
      if ((options.deferOrganizationsUntilMfa && requiresAdminMfa.value)
        || (options.deferOrganizationsUntilMfaChallenge && requiresMfaChallenge.value)) {
        clearOrganizations()
      }
      else {
        await loadOrganizations()
      }
    } else {
      clearOrganizations()
      resetMfaState()
    }
    return isAuthenticated.value
  }

  async function login(
    email: string,
    password: string,
    options: {
      deferOrganizationsUntilMfa?: boolean
      deferOrganizationsUntilMfaChallenge?: boolean
    } = {},
  ): Promise<boolean> {
    loading.value = true
    try {
      const client = useSupabaseClient()
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error || !data.session) return false
      isAuthenticated.value = true
      accessToken.value = data.session.access_token
      userEmail.value = data.user?.email ?? null
      await refreshMfaState()
      if ((options.deferOrganizationsUntilMfa && requiresAdminMfa.value)
        || (options.deferOrganizationsUntilMfaChallenge && requiresMfaChallenge.value)) {
        clearOrganizations()
      }
      else {
        await loadOrganizations()
      }
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
    clearOrganizations()
    resetMfaState()
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
    mfaCurrentLevel,
    mfaNextLevel,
    mfaAssuranceKnown,
    mfaError,
    adminMfaMode,
    requiresAdminMfa,
    requiresMfaChallenge,
    checkSession,
    login,
    logout,
    authHeader,
    setCurrentOrganization,
    loadOrganizations,
    refreshMfaState,
  }
})
