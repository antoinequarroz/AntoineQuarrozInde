<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; message: string } }>()
const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-surface-dark flex flex-col items-center justify-center px-4">
    <!-- Glow -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
    </div>

    <div class="relative text-center max-w-md">
      <div class="font-display font-bold text-[120px] leading-none text-violet-500/10 dark:text-violet-500/10 select-none mb-2">
        {{ props.error.statusCode }}
      </div>

      <h1 class="font-display font-bold text-3xl text-gray-900 dark:text-white mb-3 -mt-6">
        {{ props.error.statusCode === 404 ? 'Page introuvable' : 'Une erreur est survenue' }}
      </h1>
      <p class="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
        {{ props.error.statusCode === 404
          ? 'La page que vous cherchez n\'existe pas ou a été déplacée.'
          : props.error.message || 'Quelque chose a mal tourné.' }}
      </p>

      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
          @click="handleError"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Retour à l'accueil
        </button>
        <NuxtLink
          to="/blog"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 font-semibold text-sm transition-colors"
        >
          Voir le blog
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
