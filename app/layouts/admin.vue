<script setup lang="ts">
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

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
]

const isSidebarOpen = ref(false)

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
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-[#0b0b12] flex text-sm">

    <!-- Mobile overlay -->
    <Transition name="fade">
      <div v-if="isSidebarOpen" class="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" @click="isSidebarOpen = false" />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed top-0 left-0 h-full w-56 bg-white dark:bg-[#111118] border-r border-gray-100 dark:border-white/[0.06]
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
          target="_blank"
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
      <header class="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 sm:px-6
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
        <nav class="flex items-center gap-1.5 text-xs text-gray-400 flex-1 min-w-0">
          <NuxtLink to="/admin" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors font-medium">Admin</NuxtLink>
          <span v-if="$route.path !== '/admin'" class="text-gray-300 dark:text-gray-700">/</span>
          <span v-if="$route.path !== '/admin'" class="text-gray-600 dark:text-gray-300 font-medium truncate capitalize">
            {{ $route.path.split('/').pop() }}
          </span>
        </nav>

        <select
          v-if="auth.organizations.length > 0"
          v-model="selectedOrganizationId"
          class="h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#181826] text-xs text-gray-700 dark:text-gray-200"
        >
          <option
            v-for="org in auth.organizations"
            :key="org.id"
            :value="org.id"
          >
            {{ org.name }} ({{ org.role }})
          </option>
        </select>

        <UiThemeToggle />
      </header>

      <!-- Content -->
      <main class="flex-1 p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
