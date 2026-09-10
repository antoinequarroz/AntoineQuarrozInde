<script setup lang="ts">
const { toasts, runAction } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed right-3 top-3 z-[9999] flex max-w-[calc(100vw-1.5rem)] flex-col gap-2.5 pointer-events-none sm:right-5 sm:top-5" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :role="toast.type === 'error' ? 'alert' : 'status'"
          class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium min-w-[260px] max-w-sm"
          :class="{
            'bg-white dark:bg-[#1a1a24] border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400': toast.type === 'success',
            'bg-white dark:bg-[#1a1a24] border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400': toast.type === 'error',
            'bg-white dark:bg-[#1a1a24] border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400': toast.type === 'info',
          }"
        >
          <!-- Icon -->
          <div class="flex-shrink-0">
            <svg v-if="toast.type === 'success'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <svg v-else-if="toast.type === 'error'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span class="flex-1">{{ toast.message }}</span>
          <button v-if="toast.actionLabel" type="button" class="pointer-events-auto min-h-10 rounded-lg px-2 text-xs font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current" @click="runAction(toast)">{{ toast.actionLabel }}</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active { transition: all 0.25s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateX(16px); }
.toast-leave-to { opacity: 0; transform: translateX(16px); }
.toast-move { transition: transform 0.25s ease; }
</style>
