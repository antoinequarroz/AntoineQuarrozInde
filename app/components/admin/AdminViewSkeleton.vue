<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  variant?: 'table' | 'pipeline' | 'detail'
}>(), {
  label: 'Chargement de la vue',
  variant: 'table',
})
</script>

<template>
  <div role="status" aria-live="polite" aria-busy="true" class="space-y-4 motion-reduce:[&_*]:animate-none">
    <span class="sr-only">{{ label }}</span>

    <template v-if="variant === 'pipeline'">
      <div class="grid grid-cols-2 gap-2.5 xl:grid-cols-4" aria-hidden="true">
        <div v-for="index in 4" :key="`metric-${index}`" class="h-24 animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111118]"><div class="h-3 w-20 rounded bg-gray-200 dark:bg-white/[0.08]" /><div class="mt-4 h-7 w-12 rounded bg-gray-200 dark:bg-white/[0.08]" /></div>
      </div>
      <div class="h-16 animate-pulse rounded-lg border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]" aria-hidden="true" />
      <div class="admin-scrollbar overflow-x-auto pb-2" aria-hidden="true">
        <div class="grid min-w-[1100px] grid-cols-5 gap-3">
          <div v-for="column in 5" :key="`column-${column}`" class="min-h-64 rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-white/[0.08] dark:bg-white/[0.025]">
            <div class="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-white/[0.08]" />
            <div class="mt-4 h-24 animate-pulse rounded-lg border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]" />
            <div v-if="column < 4" class="mt-2 h-20 animate-pulse rounded-lg border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]" />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="variant === 'detail'">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" aria-hidden="true">
        <div class="space-y-2"><div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-white/[0.08]" /><div class="h-8 w-56 animate-pulse rounded bg-gray-200 dark:bg-white/[0.08]" /><div class="h-4 w-72 max-w-full animate-pulse rounded bg-gray-200 dark:bg-white/[0.08]" /></div>
        <div class="grid grid-cols-2 gap-2 sm:flex"><div v-for="index in 4" :key="`action-${index}`" class="h-11 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-white/[0.08] sm:w-28" /></div>
      </div>
      <div class="h-28 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]" aria-hidden="true" />
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true"><div v-for="index in 4" :key="`stat-${index}`" class="h-24 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]" /></div>
      <div class="grid gap-4 lg:grid-cols-2" aria-hidden="true"><div v-for="index in 4" :key="`panel-${index}`" class="h-40 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]" /></div>
    </template>

    <template v-else>
      <div class="h-16 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]" aria-hidden="true" />
      <div class="space-y-2 sm:hidden" aria-hidden="true"><div v-for="index in 3" :key="`mobile-row-${index}`" class="h-32 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]" /></div>
      <div class="hidden overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118] sm:block" aria-hidden="true">
        <div class="grid h-12 grid-cols-[1.7fr_1fr_1fr_120px] gap-4 border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]"><div v-for="index in 4" :key="`head-${index}`" class="h-3 animate-pulse rounded bg-gray-200 dark:bg-white/[0.08]" /></div>
        <div v-for="row in 5" :key="`row-${row}`" class="grid h-16 grid-cols-[1.7fr_1fr_1fr_120px] gap-4 border-b border-gray-100 px-5 py-5 last:border-0 dark:border-white/[0.04]"><div v-for="cell in 4" :key="`cell-${row}-${cell}`" class="h-3 animate-pulse rounded bg-gray-200 dark:bg-white/[0.08]" :class="cell === 1 ? 'w-4/5' : cell === 4 ? 'ml-auto w-20' : 'w-3/5'" /></div>
      </div>
    </template>
  </div>
</template>
