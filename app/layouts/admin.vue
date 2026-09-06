<script setup lang="ts">
import AdminAdminIcon from '~/components/admin/AdminIcon.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const navGroups = [
  {
    label: 'Piloter',
    items: [
      { label: 'Tableau de bord', icon: 'grid', href: '/admin' },
      { label: 'Analyses', icon: 'trending-up', href: '/admin/analytics' },
    ],
  },
  {
    label: 'Vendre',
    items: [
      { label: 'Prospects', icon: 'book-open', href: '/admin/crm' },
      { label: 'Clients', icon: 'users', href: '/admin/clients' },
      { label: 'Messages', icon: 'mail', href: '/admin/messages' },
      { label: 'Devis', icon: 'file-plus', href: '/admin/quotes' },
    ],
  },
  {
    label: 'Produire',
    items: [
      { label: 'Tâches', icon: 'check-square', href: '/admin/tasks' },
      { label: 'Agenda', icon: 'calendar', href: '/admin/appointments' },
      { label: 'Projets', icon: 'folder', href: '/admin/projects' },
    ],
  },
  {
    label: 'Encaisser',
    items: [
      { label: 'Factures', icon: 'receipt', href: '/admin/invoices' },
      { label: 'Paiements', icon: 'credit-card', href: '/admin/payments' },
      { label: 'Comptabilité', icon: 'calculator', href: '/admin/accounting' },
    ],
  },
  {
    label: 'Publier',
    items: [
      { label: 'Articles', icon: 'file-text', href: '/admin/articles' },
      { label: 'Avis', icon: 'star', href: '/admin/reviews' },
    ],
  },
  {
    label: 'Administrer',
    items: [
      { label: 'Sécurité', icon: 'shield', href: '/admin/security' },
      { label: 'Journal d’audit', icon: 'shield', href: '/admin/audit' },
      { label: 'Erreurs', icon: 'alert-triangle', href: '/admin/errors' },
    ],
  },
]

const navItems = navGroups.flatMap(group => group.items)

const isSidebarOpen = ref(false)
const hasMounted = ref(false)
const isStandalone = ref(true)
const dismissedPwaHint = ref(false)
const isMac = ref(false)
const isDesktopNavigation = ref(false)
const showSearch = ref(false)
const searchQuery = ref('')
const showAlerts = ref(false)
const closeSearchDialog = () => closeSearch()
const { dialogRef: searchDialogRef, handleDialogKeydown: handleSearchDialogKeydown } = useAccessibleDialog(showSearch, closeSearchDialog, 'input[type="search"]')
const closeSidebar = () => { isSidebarOpen.value = false }
const { dialogRef: sidebarDialogRef, handleDialogKeydown: handleSidebarKeydown } = useAccessibleDialog(isSidebarOpen, closeSidebar, '[data-mobile-nav-first]')
const searchResults = ref<Array<{ key: string, label: string, sub: string, to: string }>>([])
const alerts = ref<Array<{ id: string, text: string, to: string }>>([])
const loadingSearch = ref(false)
const searchError = ref(false)
const alertsStatus = ref<'loading' | 'ready' | 'error'>('loading')
const alertButtonRef = ref<HTMLElement | null>(null)
const alertPopoverRef = ref<HTMLElement | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null
let keydownHandler: ((event: KeyboardEvent) => void) | null = null
let pointerHandler: ((event: PointerEvent) => void) | null = null
let alertsRequestVersion = 0
let searchRequestVersion = 0
let desktopNavigationMedia: MediaQueryList | null = null
let desktopNavigationListener: (() => void) | null = null
let shortcutPrefix: 'g' | 'n' | null = null
let shortcutTimer: ReturnType<typeof setTimeout> | null = null

function isActive(href: string) {
  if (href === '/admin') return route.path === '/admin'
  return route.path.startsWith(href)
}

async function handleLogout() {
  await auth.logout()
  await router.push('/admin/login')
}

function handleOrganizationChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (!value || value === auth.currentOrganizationId) return
  auth.setCurrentOrganization(value)
  window.location.reload()
}

const adminOrganizations = computed(() => auth.organizations.filter(organization => ['owner', 'admin', 'manager'].includes(organization.role)))

const currentPageLabel = computed(() => {
  const matchingItems = navItems
    .filter(item => item.href === '/admin' ? route.path === '/admin' : route.path.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)
  return matchingItems[0]?.label || 'Administration'
})

const searchShortcut = computed(() => isMac.value ? '⌘ K' : 'Ctrl K')

const unreadAlerts = computed(() => alerts.value.length)

async function loadAlerts() {
  const requestVersion = ++alertsRequestVersion
  const organizationId = auth.currentOrganizationId
  alertsStatus.value = 'loading'
  try {
    const nextAlerts = await $fetch<Array<{ id: string, text: string, to: string }>>('/api/admin/alerts', {
      headers: auth.authHeader(),
    })
    if (requestVersion !== alertsRequestVersion || organizationId !== auth.currentOrganizationId) return
    alerts.value = nextAlerts
    alertsStatus.value = 'ready'
  }
  catch {
    if (requestVersion !== alertsRequestVersion || organizationId !== auth.currentOrganizationId) return
    alerts.value = []
    alertsStatus.value = 'error'
  }
}

async function loadSearchResults() {
  const requestVersion = ++searchRequestVersion
  const organizationId = auth.currentOrganizationId
  const q = searchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }

  loadingSearch.value = true
  searchError.value = false
  try {
    const nextResults = await $fetch<Array<{ key: string, label: string, sub: string, to: string }>>('/api/admin/search', {
      query: { q, limit: 20 },
      headers: auth.authHeader(),
    })
    if (requestVersion !== searchRequestVersion || organizationId !== auth.currentOrganizationId) return
    searchResults.value = nextResults
  }
  catch {
    if (requestVersion !== searchRequestVersion || organizationId !== auth.currentOrganizationId) return
    searchResults.value = []
    searchError.value = true
  }
  finally {
    if (requestVersion === searchRequestVersion) loadingSearch.value = false
  }
}

function openSearch() {
  showSearch.value = true
}

function closeSearch() {
  searchRequestVersion += 1
  showSearch.value = false
  searchQuery.value = ''
  searchResults.value = []
  searchError.value = false
}

function dismissPwaHint() {
  dismissedPwaHint.value = true
  localStorage.setItem('aq_admin_pwa_hint_dismissed', '1')
}

async function gotoResult(to: string) {
  const target = router.resolve(to)
  if (target.path === route.path && target.fullPath !== route.fullPath) {
    window.location.assign(target.fullPath)
    return
  }
  await router.push(to)
  closeSearch()
}

onMounted(() => {
  hasMounted.value = true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  const mediaStandalone = window.matchMedia('(display-mode: standalone)').matches
  isStandalone.value = mediaStandalone || !!nav.standalone
  dismissedPwaHint.value = localStorage.getItem('aq_admin_pwa_hint_dismissed') === '1'
  isMac.value = /Mac|iPhone|iPad/.test(navigator.platform)
  desktopNavigationMedia = window.matchMedia('(min-width: 1024px)')
  desktopNavigationListener = () => {
    isDesktopNavigation.value = Boolean(desktopNavigationMedia?.matches)
    if (isDesktopNavigation.value && isSidebarOpen.value) closeSidebar()
    if (isDesktopNavigation.value) document.body.style.overflow = ''
  }
  desktopNavigationListener()
  desktopNavigationMedia.addEventListener('change', desktopNavigationListener)

  keydownHandler = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      openSearch()
    }
    if (event.key === 'Escape' && showAlerts.value) showAlerts.value = false

    const target = event.target as HTMLElement | null
    const isEditable = target?.matches('input, textarea, select, [contenteditable="true"]')
    if (isEditable || event.ctrlKey || event.metaKey || event.altKey) return

    const key = event.key.toLowerCase()
    if (key === 'g' || key === 'n') {
      shortcutPrefix = key
      if (shortcutTimer) clearTimeout(shortcutTimer)
      shortcutTimer = setTimeout(() => { shortcutPrefix = null }, 1200)
      return
    }

    if (!shortcutPrefix) return
    const destinations: Record<'g' | 'n', Record<string, string>> = {
      g: { t: '/admin/tasks', d: '/admin/quotes', f: '/admin/invoices', p: '/admin/projects', c: '/admin/clients' },
      n: { t: '/admin/tasks?new=1', d: '/admin/quotes?new=1', f: '/admin/invoices?new=1', p: '/admin/projects?new=1' },
    }
    const destination = destinations[shortcutPrefix][key]
    const prefix = shortcutPrefix
    shortcutPrefix = null
    if (shortcutTimer) clearTimeout(shortcutTimer)
    if (destination) {
      event.preventDefault()
      const targetRoute = router.resolve(destination)
      if (prefix === 'n' && targetRoute.path === route.path) {
        window.location.assign(targetRoute.fullPath)
      }
      else {
        void router.push(destination)
      }
    }
  }

  pointerHandler = (event) => {
    const target = event.target as Node
    if (showAlerts.value && !alertButtonRef.value?.contains(target) && !alertPopoverRef.value?.contains(target)) {
      showAlerts.value = false
    }
  }

  window.addEventListener('keydown', keydownHandler)
  window.addEventListener('pointerdown', pointerHandler)
  void loadAlerts()
})

onBeforeUnmount(() => {
  if (keydownHandler) window.removeEventListener('keydown', keydownHandler)
  if (pointerHandler) window.removeEventListener('pointerdown', pointerHandler)
  if (searchTimer) clearTimeout(searchTimer)
  if (shortcutTimer) clearTimeout(shortcutTimer)
  if (desktopNavigationMedia && desktopNavigationListener) desktopNavigationMedia.removeEventListener('change', desktopNavigationListener)
  document.body.style.overflow = ''
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

watch(() => route.path, () => {
  closeSidebar()
  showAlerts.value = false
})

watch(isSidebarOpen, (open) => {
  if (!isDesktopNavigation.value) document.body.style.overflow = open ? 'hidden' : ''
})
</script>

<template>
  <div class="admin-shell min-h-screen bg-gray-50 dark:bg-[#0b0b12] flex text-sm">
    <a href="#admin-main-content" class="sr-only fixed left-3 top-3 z-[100] rounded-lg bg-gray-950 px-4 py-3 font-semibold text-white focus:not-sr-only">Aller au contenu principal</a>
    <Transition name="fade">
      <div v-if="isSidebarOpen" class="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" @click="isSidebarOpen = false" />
    </Transition>

    <aside
      id="admin-navigation"
      ref="sidebarDialogRef"
      class="admin-sidebar fixed top-0 left-0 h-full w-56 bg-white dark:bg-[#111118] border-r border-gray-100 dark:border-white/[0.06] z-50 flex flex-col transition-transform duration-300 lg:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      :role="isSidebarOpen ? 'dialog' : undefined"
      :aria-modal="isSidebarOpen ? 'true' : undefined"
      :aria-labelledby="isSidebarOpen ? 'admin-navigation-title' : undefined"
      :aria-hidden="!isSidebarOpen && !isDesktopNavigation ? 'true' : undefined"
      :inert="!isSidebarOpen && !isDesktopNavigation"
      tabindex="-1"
      @keydown="isSidebarOpen && handleSidebarKeydown($event)"
    >
      <div class="relative flex items-center gap-2.5 px-4 h-14 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0 overflow-hidden">
        <div class="pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl" />
        <div class="w-6 h-6 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <span class="font-display font-bold text-white text-xs">AQ</span>
        </div>
        <div class="flex-1 min-w-0">
          <span class="font-display font-semibold text-xs text-gray-900 dark:text-white truncate block">Antoine Quarroz</span>
          <span id="admin-navigation-title" class="block text-xs text-gray-500 dark:text-gray-400">Espace de gestion</span>
        </div>
        <button aria-label="Fermer le menu" class="lg:hidden min-h-11 min-w-11 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-1" @click="isSidebarOpen = false">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto px-2 py-3" aria-label="Navigation principale">
        <div v-for="(group, groupIndex) in navGroups" :key="group.label" :class="groupIndex ? 'mt-3' : ''">
          <p class="px-2 pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{{ group.label }}</p>
          <div class="space-y-0.5">
            <NuxtLink
              v-for="(item, itemIndex) in group.items"
              :key="item.href"
              :to="item.href"
              :data-mobile-nav-first="groupIndex === 0 && itemIndex === 0 ? '' : undefined"
              class="relative flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors duration-150 lg:min-h-9"
              :class="isActive(item.href)
                ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-white'"
              :aria-current="isActive(item.href) ? 'page' : undefined"
              @click="closeSidebar"
            >
              <span
                class="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-violet-500 transition-opacity"
                :class="isActive(item.href) ? 'opacity-100' : 'opacity-0'"
              />
              <AdminAdminIcon :icon="item.icon" class="h-3.5 w-3.5 flex-shrink-0" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <div class="px-2 py-3 border-t border-gray-100 dark:border-white/[0.06] space-y-0.5 flex-shrink-0">
        <NuxtLink
          to="/"
          class="flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Voir le site
        </NuxtLink>
        <button
          class="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/[0.08]"
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
          aria-controls="admin-navigation"
          :aria-expanded="isSidebarOpen"
          aria-label="Ouvrir le menu"
          class="lg:hidden w-11 h-11 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all"
          @click="isSidebarOpen = true"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav class="hidden min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-xs text-gray-500 dark:text-gray-400 sm:flex" aria-label="Fil d’Ariane">
          <NuxtLink to="/admin" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors font-medium">Admin</NuxtLink>
          <span v-if="route.path !== '/admin'" class="text-gray-300 dark:text-gray-700">/</span>
          <span v-if="route.path !== '/admin'" class="truncate font-medium text-gray-600 dark:text-gray-300" aria-current="page">
            {{ currentPageLabel }}
          </span>
        </nav>

        <button
          class="hidden min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs text-gray-500 transition-colors hover:border-violet-300 hover:text-violet-700 dark:border-white/[0.1] dark:text-gray-300 dark:hover:border-violet-400/50 dark:hover:text-violet-200 sm:inline-flex"
          @click="openSearch"
        >
          Rechercher
          <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-white/[0.08] dark:text-gray-200">{{ searchShortcut }}</span>
        </button>

        <button class="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-gray-200 text-gray-500 sm:hidden dark:border-white/[0.1] dark:text-gray-300" aria-label="Ouvrir la recherche globale" @click="openSearch">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </button>

        <select
          v-if="hasMounted && adminOrganizations.length > 0"
          :value="auth.currentOrganizationId || ''"
          aria-label="Organisation active"
          class="min-h-11 max-w-[38vw] rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-white/[0.1] dark:bg-[#181826] dark:text-gray-200 sm:max-w-none"
          @change="handleOrganizationChange"
        >
          <option
            v-for="org in adminOrganizations"
            :key="org.id"
            :value="org.id"
          >
            {{ org.name }}
          </option>
        </select>

        <div class="relative">
          <button
            ref="alertButtonRef"
            :aria-expanded="showAlerts"
            aria-controls="admin-alerts-popover"
            aria-haspopup="dialog"
            aria-label="Afficher les notifications"
            class="relative h-11 w-11 rounded-lg border border-gray-200 text-gray-500 dark:border-white/[0.1] dark:text-gray-300"
            @click="showAlerts = !showAlerts"
          >
            <svg class="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
            </svg>
            <span v-if="unreadAlerts" class="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-xs text-white">{{ unreadAlerts }}</span>
          </button>
          <div v-if="showAlerts" id="admin-alerts-popover" ref="alertPopoverRef" role="dialog" aria-label="Notifications" class="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-white/[0.1] dark:bg-[#171724]">
            <div class="flex min-h-10 items-center justify-between gap-2 px-2">
              <p class="text-xs font-semibold text-gray-700 dark:text-gray-200">Notifications</p>
              <button class="grid h-9 w-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]" aria-label="Fermer les notifications" @click="showAlerts = false">×</button>
            </div>
            <p v-if="alertsStatus === 'loading'" role="status" class="px-2 py-3 text-xs text-gray-500">Chargement…</p>
            <div v-else-if="alertsStatus === 'ready' && alerts.length" class="space-y-1">
              <button
                v-for="alert in alerts"
                :key="alert.id"
                class="w-full rounded-lg px-2 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.06]"
                @click="router.push(alert.to); showAlerts = false"
              >
                {{ alert.text }}
              </button>
            </div>
            <p v-else-if="alertsStatus === 'ready'" class="px-2 py-3 text-xs text-gray-500">Aucune alerte : tout est à jour.</p>
            <div v-else role="alert" class="rounded-lg bg-rose-50 px-3 py-3 text-xs text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
              <p>Les notifications n’ont pas pu être chargées.</p>
              <button class="mt-2 min-h-9 font-semibold underline underline-offset-2" @click="loadAlerts">Réessayer</button>
            </div>
          </div>
        </div>

        <UiThemeToggle />
      </header>

      <main id="admin-main-content" tabindex="-1" class="admin-main flex-1 p-4 sm:p-6">
        <div
          v-if="!isStandalone && !dismissedPwaHint"
          class="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <span>Pour un accès plus rapide, tu peux installer cette administration sur l’écran d’accueil.</span>
          <button class="grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/10" aria-label="Masquer ce conseil" @click="dismissPwaHint">×</button>
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
          <p v-if="loadingSearch" role="status" class="px-3 py-4 text-sm text-gray-500">Recherche en cours…</p>
          <button
            v-for="item in searchResults"
            :key="item.key"
            class="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/[0.06]"
            @click="gotoResult(item.to)"
          >
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ item.label }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.sub }}</p>
          </button>
          <div v-if="searchError && !loadingSearch" role="alert" class="rounded-lg bg-rose-50 px-3 py-4 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
            <p>La recherche est momentanément indisponible.</p>
            <button class="mt-2 min-h-9 text-xs font-semibold underline underline-offset-2" @click="loadSearchResults">Réessayer</button>
          </div>
          <p v-else-if="searchQuery && !loadingSearch && !searchResults.length" class="px-3 py-6 text-center text-sm text-gray-500">Aucun résultat pour « {{ searchQuery }} ».</p>
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
