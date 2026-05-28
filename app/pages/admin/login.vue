<script setup lang="ts">
definePageMeta({ layout: false })

const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')

async function handleLogin() {
  if (!email.value || !password.value) return
  error.value = ''
  const ok = await auth.login(email.value, password.value)
  if (ok) {
    await navigateTo('/admin', { replace: true })
  } else {
    error.value = 'Identifiants invalides.'
    password.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface-light-secondary dark:bg-surface-dark flex items-center justify-center p-4">
    <!-- Background -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      <div class="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
    </div>

    <div class="relative w-full max-w-md">
      <!-- Card -->
      <div class="card-glass p-8 sm:p-10">
        <!-- Logo -->
        <div class="flex justify-center mb-8">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow">
              <span class="font-display font-bold text-white text-lg">AQ</span>
            </div>
            <div>
              <div class="font-display font-bold text-xl text-gray-900 dark:text-white">Admin</div>
              <div class="text-sm text-gray-400">Antoine Quarroz</div>
            </div>
          </div>
        </div>

        <h1 class="font-display font-bold text-2xl text-gray-900 dark:text-white text-center mb-2">
          Connexion
        </h1>
        <p class="text-gray-500 dark:text-gray-400 text-center text-sm mb-8">
          Accès réservé à l'administrateur
        </p>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              v-model="email"
              type="email"
              class="input-field"
              placeholder="admin@domaine.com"
              required
              autofocus
            >
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Mot de passe
            </label>
            <input
              v-model="password"
              type="password"
              class="input-field"
              placeholder="••••••••"
              required
            >
          </div>

          <Transition name="fade">
            <div v-if="error" class="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {{ error }}
            </div>
          </Transition>

          <button
            type="submit"
            class="btn-primary w-full justify-center py-3.5"
            :disabled="auth.loading"
          >
            <svg v-if="auth.loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {{ auth.loading ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>

        <NuxtLink to="/" class="block text-center text-sm text-gray-400 hover:text-violet-500 mt-6 transition-colors">
          ← Retour au site
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
