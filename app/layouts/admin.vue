<script setup lang="ts">
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const navItems = [
  { label: 'Dashboard', icon: 'grid', href: '/admin' },
  { label: 'CRM', icon: 'book-open', href: '/admin/crm' },
  { label: 'Analytics', icon: 'trending-up', href: '/admin/analytics' },
  { label: 'Clients', icon: 'users', href: '/admin/clients' },
  { label: 'Taches', icon: 'check-square', href: '/admin/tasks' },
  { label: 'Devis', icon: 'file-plus', href: '/admin/quotes' },
  { label: 'Factures', icon: 'receipt', href: '/admin/invoices' },
  { label: 'Agenda', icon: 'calendar', href: '/admin/appointments' },
  { label: 'Projets', icon: 'folder', href: '/admin/projects' },
  { label: 'Articles', icon: 'file-text', href: '/admin/articles' },
  { label: 'Avis', icon: 'star', href: '/admin/reviews' },
  { label: 'Messages', icon: 'mail', href: '/admin/messages' },
  { label: 'Audit', icon: 'shield', href: '/admin/audit' },
  { label: 'Erreurs', icon: 'shield', href: '/admin/errors' },
]

const isSidebarOpen = ref(false)
const isStandalone = ref(true)
const showSearch = ref(false)
const searchQuery = ref('')
const showAlerts = ref(false)
const closeSearchDialog = () => closeSearch()
const { dialogRef: searchDialogRef, handleDialogKeydown: handleSearchDialogKeydown } = useAccessibleDialog(showSearch, closeSearchDialog, 'input[type="search"]')
const searchResults = ref<Array<{ key: string, label: string, sub: string, to: string }>>([])
const alerts = ref<Array<{ id: string, text: string, to: string }>>([])
const loadingSearch = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null
let keydownHandler: ((event: KeyboardEvent) => void) | null = null

function isActive(href: string) {
  if (href === '/admin') return route.path === '/admin'
  return route.path.startsWith(href)
}

async function handleLogout() {
  await auth.logout()
  await router.push('/admin/login')
}

const selectedOrganizationId = computed({
  get: () => auth.currentOrganizationId || '',
  set: (value: string) => auth.setCurrentOrganization(value),
})

const unreadAlerts = computed(() => alerts.value.length)

async function loadAlerts() {
  try {
    alerts.value = await $fetch('/api/admin/alerts', {
      headers: auth.authHeader(),
    })
  } catch {
    alerts.value = []
  }
}

async function loadSearchResults() {
  const q = searchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }

  loadingSearch.value = true
  try {
    searchResults.value = await $fetch('/api/admin/search', {
      query: { q, limit: 20 },
      headers: auth.authHeader(),
    })
  } catch {
    searchResults.value = []
  } finally {
    loadingSearch.value = false
  }
}

function openSearch() {
  showSearch.value = true
}

function closeSearch() {
  showSearch.value = false
  searchQuery.value = ''
  searchResults.value = []
}

async function gotoResult(to: string) {
  await router.push(to)
  closeSearch()
}

onMounted(() => {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  const mediaStandalone = window.matchMedia('(display-mode: standalone)').matches
  isStandalone.value = mediaStandalone || !!nav.standalone

  keydownHandler = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      openSearch()
    }
    if (event.key === 'Escape' && showSearch.value) closeSearch()
  }

  window.addEventListener('keydown', keydownHandler)
  void loadAlerts()
})

onBeforeUnmount(() => {
  if (keydownHandler) window.removeEventListener('keydown', keydownHandler)
  if (searchTimer) clearTimeout(searchTimer)
})

watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void loadSearchResults()
  }, 180)
})

watch(() => auth.currentOrganizationId, () => {
  closeSearch()
  void loadAlerts()
})
</script>

<template>
  <div class="admin-shell min-h-screen bg-gray-50 dark:bg-[#0b0b12] flex text-sm">
    <Transition name="fade">
      <div v-if="isSidebarOpen" class="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" @click="isSidebarOpen = false" />
    </Transition>

    <aside
      class="admin-sidebar fixed top-0 left-0 h-full w-56 bg-white dark:bg-[#111118] border-r border-gray-100 dark:border-white/[0.06] z-50 flex flex-col transition-transform duration-300 lg:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="relative flex items-center gap-2.5 px-4 h-14 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0 overflow-hidden">
        <div class="pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl" />
        <div class="w-6 h-6 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <span class="font-display font-bold text-white text-xs">AQ</span>
        </div>
        <div class="flex-1 min-w-0">
          <span class="font-display font-semibold text-xs text-gray-900 dark:text-white truncate block">Antoine Quarroz</span>
          <span class="text-xs text-gray-400 block">Admin</span>
        </div>
        <button aria-label="Fermer le menu" class="lg:hidden min-h-11 min-w-11 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-1" @click="isSidebarOpen = false">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav class="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p class="px-2 py-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Navigation</p>
        <NuxtLink
          v-for="item in navItems"
          :key="item.href"
          :to="item.href"
          class="relative flex min-h-11 lg:min-h-9 items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150"
          :class="isActive(item.href)
            ? 'bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-500/10 text-violet-600 dark:text-violet-400'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white'"
          @click="isSidebarOpen = false"
        >
          <span
            class="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gradient-brand transition-opacity"
            :class="isActive(item.href) ? 'opacity-100' : 'opacity-0'"
          />
          <AdminAdminIcon :icon="item.icon" class="w-3.5 h-3.5 flex-shrink-0" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="px-2 py-3 border-t border-gray-100 dark:border-white/[0.06] space-y-0.5 flex-shrink-0">
        <NuxtLink
          to="/"
          class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-700 dark:hover:text-gray-300 transition-all"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Voir le site
        </NuxtLink>
        <button
          class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/[0.08] transition-all"
          @click="handleLogout"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Déconnexion
        </button>
      </div>
    </aside>

    <div class="flex-1 lg:ml-56 flex flex-col min-h-screen min-w-0">
      <header class="admin-topbar sticky top-0 z-30 h-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 bg-white/90 dark:bg-[#111118]/90 backdrop-blur-xl border-b border-gray-100 dark:border-white/[0.06]">
        <button
          aria-label="Ouvrir le menu"
          class="lg:hidden w-11 h-11 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all"
          @click="isSidebarOpen = true"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav class="flex items-center gap-1.5 text-xs text-gray-400 flex-1 min-w-0 overflow-hidden">
          <NuxtLink to="/admin" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors font-medium">Admin</NuxtLink>
          <span v-if="route.path !== '/admin'" class="text-gray-300 dark:text-gray-700">/</span>
          <span v-if="route.path !== '/admin'" class="text-gray-600 dark:text-gray-300 font-medium truncate capitalize">
            {{ route.path.split('/').pop() }}
          </span>
        </nav>

        <button
          class="hidden sm:inline-flex h-8 items-center gap-2 rounded-lg border border-gray-200 dark:border-white/[0.1] px-2.5 text-xs text-gray-500 dark:text-gray-300"
          @click="openSearch"
        >
          Rechercher
          <span class="rounded bg-gray-100 dark:bg-white/[0.08] px-1.5 py-0.5 text-xs">Ctrl K</span>
        </button>

        <select
          v-if="auth.organizations.length > 0"
          v-model="selectedOrganizationId"
          aria-label="Organisation active"
          class="h-8 max-w-[44vw] sm:max-w-none px-2 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#181826] text-xs text-gray-700 dark:text-gray-200"
        >
          <option
            v-for="org in auth.organizations"
            :key="org.id"
            :value="org.id"
          >
            {{ org.name }} ({{ org.role }})
          </option>
        </select>

        <div class="relative">
          <button
            :aria-expanded="showAlerts"
            aria-label="Afficher les notifications"
            class="relative h-11 w-11 sm:h-9 sm:w-9 rounded-lg border border-gray-200 dark:border-white/[0.1] text-gray-500 dark:text-gray-300"
            @click="showAlerts = !showAlerts"
          >
            <svg class="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
            </svg>
            <span v-if="unreadAlerts" class="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-xs text-white">{{ unreadAlerts }}</span>
          </button>
          <div v-if="showAlerts" class="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-white/[0.1] dark:bg-[#171724]">
            <p class="px-2 py-1 text-xs font-semibold text-gray-500">Notifications</p>
            <div v-if="alerts.length" class="space-y-1">
              <button
                v-for="alert in alerts"
                :key="alert.id"
                class="w-full rounded-lg px-2 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.06]"
                @click="router.push(alert.to); showAlerts = false"
              >
                {{ alert.text }}
              </button>
            </div>
            <p v-else class="px-2 py-2 text-xs text-gray-400">Aucune alerte</p>
          </div>
        </div>

        <UiThemeToggle />
      </header>

      <main class="admin-main flex-1 p-4 sm:p-6">
        <div
          v-if="!isStandalone"
          class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
        >
          Mode navigateur détecté. Pour l'expérience PWA complète, ouvre depuis l'icône écran d'accueil.
        </div>
        <slot />
      </main>
    </div>
  </div>

  <Transition name="fade">
    <div v-if="showSearch" class="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 p-3 sm:p-6" @click.self="closeSearch">
      <div ref="searchDialogRef" role="dialog" aria-modal="true" aria-labelledby="admin-search-title" tabindex="-1" class="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-white/[0.1] dark:bg-[#151522]" @keydown="handleSearchDialogKeydown">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 id="admin-search-title" class="text-sm font-semibold text-gray-900 dark:text-white">Recherche globale</h2>
          <button type="button" aria-label="Fermer la recherche" class="grid h-11 w-11 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]" @click="closeSearch">×</button>
        </div>
        <label for="admin-global-search" class="sr-only">Rechercher dans l’administration</label>
        <input
          id="admin-global-search"
          v-model="searchQuery"
          type="search"
          class="input-field"
          placeholder="Rechercher clients, devis, factures, tâches, projets, articles..."
        >
        <div class="mt-3 max-h-[60vh] overflow-y-auto">
          <p v-if="loadingSearch" class="px-3 py-4 text-sm text-gray-400">Recherche en cours...</p>
          <button
            v-for="item in searchResults"
            :key="item.key"
            class="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/[0.06]"
            @click="gotoResult(item.to)"
          >
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ item.label }}</p>
            <p class="text-xs text-gray-400">{{ item.sub }}</p>
          </button>
          <p v-if="searchQuery && !loadingSearch && !searchResults.length" class="px-3 py-6 text-center text-sm text-gray-400">Aucun résultat</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.admin-sidebar {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.admin-topbar {
  padding-top: env(safe-area-inset-top);
  min-height: calc(3.5rem + env(safe-area-inset-top));
}

.admin-main {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
}

@media (max-width: 430px) {
  .admin-main {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
}
</style>
