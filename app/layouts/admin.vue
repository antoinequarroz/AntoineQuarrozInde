<script setup lang="ts">
import type { ContactMessage } from '~/types'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const clients = useClientsStore()
const tasks = useTasksStore()
const quotes = useQuotesStore()
const invoices = useInvoicesStore()
const appointments = useAppointmentsStore()
const projects = useProjectsStore()
const articles = useArticlesStore()

const navItems = [
  { label: 'Dashboard', icon: 'grid', href: '/admin' },
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
]

const isSidebarOpen = ref(false)
const isStandalone = ref(true)
const showSearch = ref(false)
const searchQuery = ref('')
const showAlerts = ref(false)
const messages = ref<ContactMessage[]>([])
const loadingMessages = ref(false)

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

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  const out: Array<{ key: string, label: string, sub: string, to: string }> = []
  for (const c of clients.clients) {
    if ([c.name, c.company || '', c.email].join(' ').toLowerCase().includes(q)) {
      out.push({ key: `client-${c.id}`, label: c.name, sub: `Client · ${c.email}`, to: `/admin/clients/${c.id}` })
    }
  }
  for (const t of tasks.tasks) {
    if ([t.title, t.description || ''].join(' ').toLowerCase().includes(q)) {
      out.push({ key: `task-${t.id}`, label: t.title, sub: `Tache · ${t.status}`, to: '/admin/tasks' })
    }
  }
  for (const qte of quotes.quotes) {
    if ([qte.number, qte.title].join(' ').toLowerCase().includes(q)) {
      out.push({ key: `quote-${qte.id}`, label: `${qte.number} · ${qte.title}`, sub: `Devis · ${qte.status}`, to: '/admin/quotes' })
    }
  }
  for (const inv of invoices.invoices) {
    if ([inv.number, inv.notes || ''].join(' ').toLowerCase().includes(q)) {
      out.push({ key: `invoice-${inv.id}`, label: inv.number, sub: `Facture · ${inv.status}`, to: '/admin/invoices' })
    }
  }
  for (const p of projects.projects) {
    if ([p.title, p.description, p.tags.join(' ')].join(' ').toLowerCase().includes(q)) {
      out.push({ key: `project-${p.id}`, label: p.title, sub: `Projet · ${p.category}`, to: '/admin/projects' })
    }
  }
  for (const a of articles.articles) {
    if ([a.title, a.excerpt, a.tags.join(' ')].join(' ').toLowerCase().includes(q)) {
      out.push({ key: `article-${a.id}`, label: a.title, sub: `Article · ${a.published ? 'publie' : 'brouillon'}`, to: '/admin/articles' })
    }
  }
  return out.slice(0, 20)
})

const alerts = computed(() => {
  const now = new Date().toISOString()
  const dueSoonIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const overdueCount = invoices.invoices.filter(i => i.status === 'overdue').length
  const draftQuotes = quotes.quotes.filter(q => q.status === 'draft').length
  const nextAppt = appointments.appointments
    .filter(a => a.status === 'scheduled' && a.startsAt >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const dueTasks = tasks.tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate <= dueSoonIso).length
  const newMessages = messages.value.filter(m => m.status === 'new').length
  const list: Array<{ id: string, text: string, to: string }> = []
  if (overdueCount > 0) list.push({ id: 'overdue', text: `${overdueCount} facture(s) en retard`, to: '/admin/invoices' })
  if (newMessages > 0) list.push({ id: 'messages', text: `${newMessages} nouveau(x) message(s)`, to: '/admin/messages' })
  if (draftQuotes > 0) list.push({ id: 'quotes', text: `${draftQuotes} devis en brouillon`, to: '/admin/quotes' })
  if (dueTasks > 0) list.push({ id: 'tasks', text: `${dueTasks} tache(s) a traiter sous 3 jours`, to: '/admin/tasks' })
  if (nextAppt) list.push({ id: 'appt', text: `Prochain RDV: ${nextAppt.title}`, to: '/admin/appointments' })
  return list
})

const unreadAlerts = computed(() => alerts.value.length)

async function ensureSearchData() {
  await Promise.all([
    clients.ensureLoaded(),
    tasks.ensureLoaded(),
    quotes.ensureLoaded(),
    invoices.ensureLoaded(),
    appointments.ensureLoaded(),
    projects.ensureLoaded(),
    articles.ensureLoaded(),
  ])
}

async function loadMessages() {
  if (loadingMessages.value) return
  loadingMessages.value = true
  try {
    messages.value = await $fetch<ContactMessage[]>('/api/messages', { headers: auth.authHeader() })
  } catch {
    messages.value = []
  } finally {
    loadingMessages.value = false
  }
}

function openSearch() {
  showSearch.value = true
  void ensureSearchData()
}

function closeSearch() {
  showSearch.value = false
  searchQuery.value = ''
}

async function gotoResult(to: string) {
  await router.push(to)
  closeSearch()
}

onMounted(() => {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  const mediaStandalone = window.matchMedia('(display-mode: standalone)').matches
  isStandalone.value = mediaStandalone || !!nav.standalone
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      openSearch()
    }
    if (e.key === 'Escape' && showSearch.value) closeSearch()
  })
  void ensureSearchData()
  void loadMessages()
})
</script>

<template>
  <div class="admin-shell min-h-screen bg-gray-50 dark:bg-[#0b0b12] flex text-sm">

    <!-- Mobile overlay -->
    <Transition name="fade">
      <div v-if="isSidebarOpen" class="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" @click="isSidebarOpen = false" />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="admin-sidebar fixed top-0 left-0 h-full w-56 bg-white dark:bg-[#111118] border-r border-gray-100 dark:border-white/[0.06]
             z-50 flex flex-col transition-transform duration-300 lg:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Branding -->
      <div class="flex items-center gap-2.5 px-4 h-14 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
        <div class="w-6 h-6 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0">
          <span class="font-display font-bold text-white text-[10px]">AQ</span>
        </div>
        <div class="flex-1 min-w-0">
          <span class="font-display font-semibold text-xs text-gray-900 dark:text-white truncate block">Antoine Quarroz</span>
          <span class="text-[10px] text-gray-400 block">Admin</span>
        </div>
        <button class="lg:hidden text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-1" @click="isSidebarOpen = false">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p class="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Navigation</p>
        <NuxtLink
          v-for="item in navItems"
          :key="item.href"
          :to="item.href"
          class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150"
          :class="isActive(item.href)
            ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white'"
          @click="isSidebarOpen = false"
        >
          <!-- icons 14px -->
          <svg v-if="item.icon === 'grid'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <svg v-else-if="item.icon === 'folder'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <svg v-else-if="item.icon === 'file-text'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <svg v-else-if="item.icon === 'star'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <svg v-else-if="item.icon === 'mail'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <svg v-else-if="item.icon === 'shield'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <svg v-else-if="item.icon === 'users'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <svg v-else-if="item.icon === 'check-square'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <svg v-else-if="item.icon === 'file-plus'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <svg v-else-if="item.icon === 'receipt'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M4 3h16v18l-3-2-3 2-3-2-3 2-3-2-3 2V3z"/>
            <line x1="8" y1="8" x2="16" y2="8"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          <svg v-else-if="item.icon === 'calendar'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- Bottom -->
      <div class="px-2 py-3 border-t border-gray-100 dark:border-white/[0.06] space-y-0.5 flex-shrink-0">
        <NuxtLink
          to="/"
          class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-400 dark:text-gray-500
                 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-700 dark:hover:text-gray-300 transition-all"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
          Voir le site
        </NuxtLink>
        <button
          class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium
                 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/[0.08] transition-all"
          @click="handleLogout"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Déconnexion
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 lg:ml-56 flex flex-col min-h-screen min-w-0">
      <!-- Topbar -->
      <header class="admin-topbar sticky top-0 z-30 h-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-6
                     bg-white/90 dark:bg-[#111118]/90 backdrop-blur-xl
                     border-b border-gray-100 dark:border-white/[0.06]">
        <button
          class="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center
                 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all"
          @click="isSidebarOpen = true"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        <!-- Breadcrumb -->
        <nav class="flex items-center gap-1.5 text-xs text-gray-400 flex-1 min-w-0 overflow-hidden">
          <NuxtLink to="/admin" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors font-medium">Admin</NuxtLink>
          <span v-if="$route.path !== '/admin'" class="text-gray-300 dark:text-gray-700">/</span>
          <span v-if="$route.path !== '/admin'" class="text-gray-600 dark:text-gray-300 font-medium truncate capitalize">
            {{ $route.path.split('/').pop() }}
          </span>
        </nav>

        <button
          class="hidden sm:inline-flex h-8 items-center gap-2 rounded-lg border border-gray-200 dark:border-white/[0.1] px-2.5 text-xs text-gray-500 dark:text-gray-300"
          @click="openSearch"
        >
          Rechercher
          <span class="rounded bg-gray-100 dark:bg-white/[0.08] px-1.5 py-0.5 text-[10px]">Ctrl K</span>
        </button>

        <select
          v-if="auth.organizations.length > 0"
          v-model="selectedOrganizationId"
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
            class="relative h-8 w-8 rounded-lg border border-gray-200 dark:border-white/[0.1] text-gray-500 dark:text-gray-300"
            @click="showAlerts = !showAlerts"
          >
            <svg class="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9"/>
            </svg>
            <span v-if="unreadAlerts" class="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">{{ unreadAlerts }}</span>
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

      <!-- Content -->
      <main class="admin-main flex-1 p-4 sm:p-6">
        <div
          v-if="!isStandalone"
          class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
        >
          Mode navigateur detecte. Pour l'experience PWA complete, ouvre depuis l'icone ecran d'accueil.
        </div>
        <slot />
      </main>
    </div>
  </div>

  <Transition name="fade">
    <div v-if="showSearch" class="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 p-3 sm:p-6" @click.self="closeSearch">
      <div class="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-white/[0.1] dark:bg-[#151522]">
        <input
          v-model="searchQuery"
          type="text"
          autofocus
          class="input-field"
          placeholder="Rechercher clients, devis, factures, taches, projets, articles..."
        >
        <div class="mt-3 max-h-[60vh] overflow-y-auto">
          <button
            v-for="item in searchResults"
            :key="item.key"
            class="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/[0.06]"
            @click="gotoResult(item.to)"
          >
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ item.label }}</p>
            <p class="text-xs text-gray-400">{{ item.sub }}</p>
          </button>
          <p v-if="searchQuery && !searchResults.length" class="px-3 py-6 text-center text-sm text-gray-400">Aucun resultat</p>
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
